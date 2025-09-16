import * as RankingEvent from "../schemas/RankingEvent"
import { Id } from "../_generated/dataModel"
import { QueryCtx, MutationCtx } from "../_generated/server"
import { DirectAggregate } from "@convex-dev/aggregate"
import { components } from "../_generated/api"
import type { Id as DataModelId } from "../_generated/dataModel"

// Direct aggregate for rankings (not tied to a table)
// Namespace by topicId, sort by position
const rankingsAggregate = new DirectAggregate<{
  Namespace: DataModelId<"topics">;
  Key: number; // position (1-based)
  Id: string; // studentId
}>(components.aggregate)

/**
 * Gets the active selection period.
 * Returns null if no active period exists.
 */
export const getActiveSelectionPeriod = async (ctx: QueryCtx) => {
  return await ctx.db
    .query("selectionPeriods")
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .first()
}

export const updateRankingsAggregateUtil = async (
  ctx: MutationCtx,
  args: {
    studentId: string
    oldRankings?: { topicId: DataModelId<"topics">; position: number }[]
    newRankings: { topicId: DataModelId<"topics">; position: number }[]
  }
) => {
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
}

/**
 * Creates ranking events and updates rankings aggregate.
 * Used when saving/updating preferences.
 */
export const createRankingEventsAndUpdateAggregate = async (
  ctx: MutationCtx,
  args: {
    studentId: string
    semesterId: string
    topicOrder: Id<"topics">[]
    existingTopicOrder?: Id<"topics">[]
  }
) => {
  // Track ranking events for analytics
  const newRankings = args.topicOrder.map((topicId, index) => ({
    topicId,
    position: index + 1 // 1-based positioning
  }))

  // Get old rankings if updating
  const oldRankings = args.existingTopicOrder ? args.existingTopicOrder.map((topicId, index) => ({
    topicId,
    position: index + 1
  })) : undefined

  // Create ranking events
  const rankingEvents = oldRankings 
    ? (() => {
        const oldMap = new Map(oldRankings.map(r => [r.topicId, r.position]))
        const newMap = new Map(newRankings.map(r => [r.topicId, r.position]))
        
        // Generate events for removed, added, and moved topics
        const removedEvents = oldRankings
          .filter(old => !newMap.has(old.topicId))
          .map(old => RankingEvent.make({
            topicId: old.topicId as string,
            studentId: args.studentId,
            position: 0,
            previousPosition: old.position,
            action: "removed",
            semesterId: args.semesterId,
          }))
        
        const addedAndMovedEvents = newRankings
          .map(newRank => {
            const oldPosition = oldMap.get(newRank.topicId)
            if (!oldPosition) {
              return RankingEvent.make({
                topicId: newRank.topicId as string,
                studentId: args.studentId,
                position: newRank.position,
                action: "added",
                semesterId: args.semesterId,
              })
            } else if (oldPosition !== newRank.position) {
              return RankingEvent.make({
                topicId: newRank.topicId as string,
                studentId: args.studentId,
                position: newRank.position,
                previousPosition: oldPosition,
                action: "moved",
                semesterId: args.semesterId,
              })
            }
            return null
          })
          .filter(event => event !== null)
        
        return [...removedEvents, ...addedAndMovedEvents]
      })()
    : newRankings.map(newRank => 
        RankingEvent.make({
          topicId: newRank.topicId as string,
          studentId: args.studentId,
          position: newRank.position,
          action: "added",
          semesterId: args.semesterId,
        })
      )
  
  // Insert all ranking events in parallel
  await Promise.all(
    rankingEvents.map(event => ctx.db.insert("rankingEvents", event))
  )

  // Update rankings aggregate
  await updateRankingsAggregateUtil(ctx, {studentId: args.studentId, oldRankings, newRankings})
}
