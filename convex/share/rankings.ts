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

type Ranking = { topicId: Id<"topics">; position: number }

function buildRankingEvents(
  args: { studentId: string; semesterId: string },
  newRankings: Ranking[],
  oldRankings?: Ranking[]
) {
  const base = { studentId: args.studentId, semesterId: args.semesterId }

  const makeAdded = (topicId: Id<"topics">, position: number) =>
    RankingEvent.make({ ...base, topicId, position, action: "added" })

  const makeRemoved = (topicId: Id<"topics">, previousPosition: number) =>
    RankingEvent.make({ ...base, topicId, position: 0, previousPosition, action: "removed" })

  const makeMoved = (topicId: Id<"topics">, position: number, previousPosition: number) =>
    RankingEvent.make({ ...base, topicId, position, previousPosition, action: "moved" })

  // If no previous rankings, everything is "added"
  if (!oldRankings?.length) {
    return newRankings.map(r => makeAdded(r.topicId, r.position))
  }

  const toMap = (rs: Ranking[]) => new Map(rs.map(r => [r.topicId, r.position]))
  const oldMap = toMap(oldRankings)
  const newMap = toMap(newRankings)

  const events: ReturnType<typeof RankingEvent.make>[] = []

  // Removed topics
  for (const { topicId, position } of oldRankings) {
    if (!newMap.has(topicId)) {
      events.push(makeRemoved(topicId, position))
    }
  }

  // Added or moved topics
  for (const { topicId, position } of newRankings) {
    if (!oldMap.has(topicId)) {
      events.push(makeAdded(topicId, position))
    } else {
      const previousPosition = oldMap.get(topicId)!
      if (previousPosition !== position) {
        events.push(makeMoved(topicId, position, previousPosition))
      }
    }
  }

  return events
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
    topicOrder: ReadonlyArray<Id<"topics">>
    existingTopicOrder?: ReadonlyArray<Id<"topics">>
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

  const rankingEvents = buildRankingEvents(
    { studentId: args.studentId, semesterId: args.semesterId },
    newRankings,
    oldRankings
  )

  const eventsPromise = Promise.all(
    rankingEvents.map(event => ctx.db.insert("rankingEvents", event))
  )
  const aggregatePromise = updateRankingsAggregateUtil(ctx, { studentId: args.studentId, oldRankings, newRankings })

  await Promise.all([eventsPromise, aggregatePromise])
}
