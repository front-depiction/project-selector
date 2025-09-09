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
    // Clear all old rankings for this student across all topics and positions
    // We need to be thorough since a student might have changed their rankings completely
    if (args.oldRankings) {
      // Delete each old ranking, handling cases where it might not exist
      for (const ranking of args.oldRankings) {
        await rankingsAggregate.deleteIfExists(ctx, {
          namespace: ranking.topicId,
          key: ranking.position,
          id: args.studentId,
        });
      }
    }

    // Insert new rankings
    // Use replaceOrInsert to handle any edge cases where the ranking might already exist
    for (const ranking of args.newRankings) {
      await rankingsAggregate.replaceOrInsert(ctx, 
        {
          namespace: ranking.topicId,
          key: ranking.position,
          id: args.studentId,
        },
        {
          namespace: ranking.topicId,
          key: ranking.position,
          id: args.studentId,
          sumValue: ranking.position, // For average calculation
        }
      );
    }

    return { success: true };
  },
});

// Get competition metrics for a topic
export const getTopicMetrics = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const count = await rankingsAggregate.count(ctx, { namespace: args.topicId });
    const sum = await rankingsAggregate.sum(ctx, { namespace: args.topicId });
    
    const averagePosition = count > 0 ? sum / count : 0;
    
    // Get how many students ranked it as their top choice (position 1)
    const topChoiceCount = await rankingsAggregate.count(ctx, { 
      namespace: args.topicId,
      bounds: { lower: { key: 1, inclusive: true }, upper: { key: 1, inclusive: true } }
    });
    
    // Get how many ranked it in top 3
    const top3Count = await rankingsAggregate.count(ctx, { 
      namespace: args.topicId,
      bounds: { upper: { key: 3, inclusive: true } }
    });
    
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
        const count = await rankingsAggregate.count(ctx, { namespace: topic._id });
        const sum = await rankingsAggregate.sum(ctx, { namespace: topic._id });
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
    metrics.sort((a, b) => {
      if (a.averagePosition === 0) return 1;
      if (b.averagePosition === 0) return 1;
      return a.averagePosition - b.averagePosition;
    });

    return metrics;
  },
});

// Migration: Clear and rebuild aggregate from existing preferences
export const rebuildRankingsAggregate = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear the entire aggregate
    await rankingsAggregate.clear(ctx);
    
    // Get all preferences
    const preferences = await ctx.db.query("preferences").collect();
    
    let totalProcessed = 0;
    
    // Process each preference
    for (const pref of preferences) {
      const rankings = pref.topicOrder.map((topicId, index) => ({
        topicId,
        position: index + 1
      }));
      
      // Insert rankings using insertIfDoesNotExist for safety
      for (const ranking of rankings) {
        await rankingsAggregate.insertIfDoesNotExist(ctx, {
          namespace: ranking.topicId,
          key: ranking.position,
          id: pref.studentId,
          sumValue: ranking.position,
        });
        totalProcessed++;
      }
    }
    
    return { 
      success: true, 
      message: `Rebuilt aggregate with ${totalProcessed} rankings from ${preferences.length} preferences`
    };
  },
});