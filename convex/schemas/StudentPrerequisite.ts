import { v } from "convex/values"
import type { Infer } from "convex/values"
import { Id } from "../_generated/dataModel"

/**
 * Convex validator for StudentPrerequisite objects.
 * Represents a student's self-reported evaluation of whether a prerequisite is met.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const StudentPrerequisite = v.object({
  studentId: v.string(),
  prerequisiteId: v.id("prerequisites"),
  isMet: v.boolean(), // Whether student confirms they meet the prerequisite
  lastUpdated: v.number()
})

/**
 * StudentPrerequisite type representing a student's evaluation of a prerequisite.
 * 
 * @category Types
 * @since 0.1.0
 */
export type StudentPrerequisite = Readonly<Infer<typeof StudentPrerequisite>>

/**
 * Creates a new StudentPrerequisite evaluation.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as StudentPrerequisite from "./schemas/StudentPrerequisite"
 * 
 * const evaluation = StudentPrerequisite.make({
 *   studentId: "S123456",
 *   prerequisiteId: prerequisiteId,
 *   isMet: true
 * })
 */
export const make = (params: {
  readonly studentId: string
  readonly prerequisiteId: Id<"prerequisites">
  readonly isMet: boolean
}): StudentPrerequisite => ({
  studentId: params.studentId,
  prerequisiteId: params.prerequisiteId,
  isMet: params.isMet,
  lastUpdated: Date.now()
} as const)

/**
 * Updates the isMet status of a student prerequisite evaluation.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const updateMetStatus = (
  studentPrerequisite: StudentPrerequisite,
  isMet: boolean
): StudentPrerequisite => ({
  ...studentPrerequisite,
  isMet,
  lastUpdated: Date.now()
} as const)

/**
 * Checks if a student prerequisite belongs to a student.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToStudent = (studentId: string) => 
  (studentPrerequisite: StudentPrerequisite): boolean =>
    studentPrerequisite.studentId === studentId

/**
 * Checks if a student prerequisite belongs to a prerequisite.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToPrerequisite = (prerequisiteId: Id<"prerequisites">) => 
  (studentPrerequisite: StudentPrerequisite): boolean =>
    studentPrerequisite.prerequisiteId === prerequisiteId

/**
 * Filters student prerequisites that are met.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isMet = (studentPrerequisite: StudentPrerequisite): boolean =>
  studentPrerequisite.isMet

/**
 * Filters student prerequisites that are not met.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isNotMet = (studentPrerequisite: StudentPrerequisite): boolean =>
  !studentPrerequisite.isMet