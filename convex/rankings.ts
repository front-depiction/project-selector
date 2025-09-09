import { DirectAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Direct aggregate for rankings (not tied to a table)
// Namespace by topicId, sort by position
const rankingsAggregate = new DirectAggregate<{
  Namespace: Id<"topics">;
  Key: number; // position (1-based)
  Id: string; // studentId
}>(components.aggregate);

// Update rankings in the aggregate (called when preferences change)
export const updateRankingsAggregate = mutation({
  args: {
    studentId: v.string(),
    oldRankings: v.optional(v.array(v.object({
      topicId: v.id("topics"),
      position: v.number(),
    }))),
    newRankings: v.array(v.object({
      topicId: v.id("topics"),
      position: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Clear old rankings in parallel (if they exist)
    const deletions = args.oldRankings
      ? Promise.all(
          args.oldRankings.map(ranking =>
            rankingsAggregate.deleteIfExists(ctx, {
              namespace: ranking.topicId,
              key: ranking.position,
              id: args.studentId,
            })
          )
        )
      : Promise.resolve([]);

    // Insert new rankings in parallel
    const insertions = Promise.all(
      args.newRankings.map(ranking =>
        rankingsAggregate.replaceOrInsert(ctx,
          {
            namespace: ranking.topicId,
            key: ranking.position,
            id: args.studentId,
          },
          {
            namespace: ranking.topicId,
            key: ranking.position,
            sumValue: ranking.position, // For average calculation
          }
        )
      )
    );

    // Execute both operations in parallel
    await Promise.all([deletions, insertions]);

    return { success: true };
  },
});

// Get competition metrics for a topic
export const getTopicMetrics = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    // Fetch all metrics in parallel
    const [count, sum, topChoiceCount, top3Count] = await Promise.all([
      rankingsAggregate.count(ctx, { namespace: args.topicId }),
      rankingsAggregate.sum(ctx, { namespace: args.topicId }),
      rankingsAggregate.count(ctx, {
        namespace: args.topicId,
        bounds: { lower: { key: 1, inclusive: true }, upper: { key: 1, inclusive: true } }
      }),
      rankingsAggregate.count(ctx, {
        namespace: args.topicId,
        bounds: { upper: { key: 3, inclusive: true } }
      })
    ]);

    const averagePosition = count > 0 ? sum / count : 0;

    return {
      topicId: args.topicId,
      studentCount: count,
      sumOfPositions: sum,
      averagePosition,
      topChoiceCount,
      top3Count,
    };
  },
});

// Get metrics for all topics
export const getAllTopicMetrics = query({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db.query("topics")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    const metrics = await Promise.all(
      topics.map(async (topic) => {
        // Fetch count and sum in parallel
        const [count, sum] = await Promise.all([
          rankingsAggregate.count(ctx, { namespace: topic._id }),
          rankingsAggregate.sum(ctx, { namespace: topic._id })
        ]);
        const averagePosition = count > 0 ? sum / count : 0;

        return {
          topicId: topic._id,
          title: topic.title,
          description: topic.description,
          studentCount: count,
          averagePosition,
        };
      })
    );

    // Sort by average position (lower is more competitive)
    return metrics.sort((a, b) => {
      if (a.averagePosition === 0) return 1;
      if (b.averagePosition === 0) return 1;
      return a.averagePosition - b.averagePosition;
    });
  },
});

// Migration: Clear and rebuild aggregate from existing preferences
export const rebuildRankingsAggregate = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all data in parallel
    const [topics, preferences] = await Promise.all([
      ctx.db.query("topics").collect(),
      ctx.db.query("preferences").collect()
    ]);
    
    // Clear all topic namespaces in parallel
    await Promise.all(
      topics.map(topic => 
        rankingsAggregate.clear(ctx, { namespace: topic._id })
      )
    );

    // Transform preferences into rankings
    const allRankings = preferences.flatMap(pref =>
      pref.topicOrder.map((topicId, index) => ({
        namespace: topicId,
        key: index + 1,
        id: pref.studentId,
        sumValue: index + 1,
      }))
    );

    // Insert all rankings in parallel
    await Promise.all(
      allRankings.map(ranking =>
        rankingsAggregate.insertIfDoesNotExist(ctx, ranking)
      )
    );

    return {
      success: true,
      message: `Cleared ${topics.length} topic namespaces and rebuilt aggregate with ${allRankings.length} rankings from ${preferences.length} preferences`
    };
  },
});