import { v } from "convex/values"
import type { Infer } from "convex/values"
import { Id } from "../_generated/dataModel"

/**
 * Convex validator for PreferencePrerequisite objects.
 * Represents the many-to-many relationship between Preference and Prerequisite.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const PreferencePrerequisite = v.object({
  preferenceId: v.id("preferences"),
  prerequisiteId: v.id("prerequisites"),
  isMet: v.boolean()
})

/**
 * PreferencePrerequisite type representing the relationship between a preference and a prerequisite.
 * 
 * @category Types
 * @since 0.1.0
 */
export type PreferencePrerequisite = Readonly<Infer<typeof PreferencePrerequisite>>

/**
 * Creates a new PreferencePrerequisite relationship.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as PreferencePrerequisite from "./schemas/PreferencePrerequisite"
 * 
 * const relationship = PreferencePrerequisite.make({
 *   preferenceId: preferenceId,
 *   prerequisiteId: prerequisiteId,
 *   isMet: false
 * })
 */
export const make = (params: {
  readonly preferenceId: Id<"preferences">
  readonly prerequisiteId: Id<"prerequisites">
  readonly isMet: boolean
}): PreferencePrerequisite => ({
  preferenceId: params.preferenceId,
  prerequisiteId: params.prerequisiteId,
  isMet: params.isMet
} as const)

/**
 * Updates the isMet status of a preference-prerequisite relationship.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const updateMetStatus = (
  relationship: PreferencePrerequisite,
  isMet: boolean
): PreferencePrerequisite => ({
  ...relationship,
  isMet
} as const)

/**
 * Checks if a preference-prerequisite relationship belongs to a preference.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToPreference = (preferenceId: Id<"preferences">) => 
  (relationship: PreferencePrerequisite): boolean =>
    relationship.preferenceId === preferenceId

/**
 * Checks if a preference-prerequisite relationship belongs to a prerequisite.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToPrerequisite = (prerequisiteId: Id<"prerequisites">) => 
  (relationship: PreferencePrerequisite): boolean =>
    relationship.prerequisiteId === prerequisiteId

/**
 * Filters relationships by their met status.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isMet = (relationship: PreferencePrerequisite): boolean =>
  relationship.isMet

/**
 * Filters relationships by their unmet status.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isNotMet = (relationship: PreferencePrerequisite): boolean =>
  !relationship.isMet