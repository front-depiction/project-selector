import { v } from "convex/values"

/**
 * Schema for ranking events - tracks changes to topic rankings over time.
 * 
 * @category Schemas
 * @since 0.2.0
 */
export const RankingEvent = {
  topicId: v.id("topics"),
  studentId: v.string(),
  position: v.number(), // 1-based position
  previousPosition: v.optional(v.number()), // null if new ranking
  action: v.union(v.literal("added"), v.literal("moved"), v.literal("removed")),
  semesterId: v.string(),
}

export type RankingEvent = typeof RankingEvent

/**
 * Create a ranking event.
 * 
 * @category Factories
 * @since 0.2.0
 */
export const make = (params: {
  topicId: string
  studentId: string
  position: number
  previousPosition?: number
  action: "added" | "moved" | "removed"
  semesterId: string
}) => ({
  topicId: params.topicId as any,
  studentId: params.studentId,
  position: params.position,
  previousPosition: params.previousPosition,
  action: params.action,
  semesterId: params.semesterId,
})