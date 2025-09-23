import { DirectAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { updateRankingsAggregateUtil, createRankingEventsAndUpdateAggregate } from "./share/rankings";

// Direct aggregate for rankings (not tied to a table)
// Namespace by topicId, sort by position
const rankingsAggregate = new DirectAggregate<{
  Namespace: Id<"topics">;
  Key: number; // position (1-based)
  Id: string; // studentId
}>(components.aggregate);

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
    await updateRankingsAggregateUtil(ctx, {
      studentId: args.studentId,
      oldRankings: args.oldRankings,
      newRankings: args.newRankings
    });

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

/**
 * Internal mutation for batch processing rankings.
 * Used by seedTestData to defer ranking aggregation.
 *
 * @category Internal Mutations
 * @since 0.1.0
 */
export const processRankingBatch = internalMutation({
  args: {
    students: v.array(v.object({
      studentId: v.string(),
      semesterId: v.string(),
      topicOrder: v.array(v.id("topics"))
    }))
  },
  handler: async (ctx, args) => {
    // Process all rankings in parallel

    return await Promise.all(
      args.students.map(({ studentId, semesterId, topicOrder }) =>
        createRankingEventsAndUpdateAggregate(ctx, { studentId, semesterId, topicOrder })
      )
    )
  }
});
