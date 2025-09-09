import { v } from "convex/values"
import type { Infer } from "convex/values"
import { Id } from "../_generated/dataModel"

/**
 * Convex validator for Preference objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const Preference = v.object({
  studentId: v.string(),
  semesterId: v.string(),
  topicOrder: v.array(v.id("topics")),
  lastUpdated: v.number()
})

/**
 * Preference type representing student topic preferences.
 * 
 * @category Types
 * @since 0.1.0
 */
export type Preference = Readonly<Infer<typeof Preference>>

/**
 * Creates a new Preference.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as Preference from "./schemas/Preference"
 * 
 * const pref = Preference.make({
 *   studentId: "S123456",
 *   semesterId: "2024-spring",
 *   topicOrder: [topicId1, topicId2, topicId3]
 * })
 */
export const make = (params: {
  readonly studentId: string
  readonly semesterId: string
  readonly topicOrder: ReadonlyArray<Id<"topics">>
}): Preference => ({
  studentId: params.studentId,
  semesterId: params.semesterId,
  topicOrder: [...params.topicOrder],
  lastUpdated: Date.now()
} as const)

/**
 * Updates the topic order of a preference.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const updateOrder = (
  preference: Preference,
  newOrder: ReadonlyArray<Id<"topics">>
): Preference => ({
  ...preference,
  topicOrder: [...newOrder],
  lastUpdated: Date.now()
} as const)

/**
 * Checks if a preference belongs to a student.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToStudent = (studentId: string) => (preference: Preference): boolean =>
  preference.studentId === studentId

/**
 * Checks if a preference belongs to a semester.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToSemester = (semesterId: string) => (preference: Preference): boolean =>
  preference.semesterId === semesterId

/**
 * Gets the rank of a topic in the preference order (1-indexed).
 * Returns undefined if topic is not in the order.
 * 
 * @category Getters
 * @since 0.1.0
 */
export const getTopicRank = (topicId: Id<"topics">) => (preference: Preference): number | undefined => {
  const index = preference.topicOrder.indexOf(topicId)
  return index === -1 ? undefined : index + 1
}

/**
 * Checks if a topic is selected in the preferences.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const hasSelectedTopic = (topicId: Id<"topics">) => (preference: Preference): boolean =>
  preference.topicOrder.includes(topicId)