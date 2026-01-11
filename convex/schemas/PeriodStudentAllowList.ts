import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for PeriodStudentAllowList entries.
 * Controls which students (by access code) can participate in a selection period.
 * All students with codes can access ALL topics in that period's semester.
 * 
 * @category Validators
 * @since 0.3.0
 */
export const PeriodStudentAllowList = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  studentId: v.string(),        // Access code (not a real student ID)
  note: v.optional(v.string()),
  addedAt: v.number(),
  addedBy: v.string(),          // Teacher's email who added
})

/**
 * PeriodStudentAllowList type for per-period student access control.
 * 
 * @category Types
 * @since 0.3.0
 */
export type PeriodStudentAllowList = Readonly<Infer<typeof PeriodStudentAllowList>>

/**
 * Creates a new PeriodStudentAllowList entry.
 * 
 * @category Constructors
 * @since 0.3.0
 */
export const make = (params: {
  readonly selectionPeriodId: string
  readonly studentId: string
  readonly addedBy: string
  readonly note?: string
}): PeriodStudentAllowList => ({
  selectionPeriodId: params.selectionPeriodId as any,
  studentId: params.studentId.trim().toUpperCase(),
  note: params.note,
  addedAt: Date.now(),
  addedBy: params.addedBy,
})
