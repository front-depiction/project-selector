import { v } from "convex/values"
import type { Infer } from "convex/values"
import { Id } from "../_generated/dataModel"

/**
 * Convex validator for StudentAnswer objects.
 *
 * @category Validators
 * @since 0.1.0
 */
export const StudentAnswer = v.object({
  studentId: v.string(),
  selectionPeriodId: v.id("selectionPeriods"),
  questionId: v.id("questions"),
  normalizedAnswer: v.number(),
  rawAnswer: v.union(
    v.object({ kind: v.literal("boolean"), value: v.boolean() }),
    v.object({ kind: v.literal("0to10"), value: v.number() })
  ),
  answeredAt: v.number()
})

/**
 * StudentAnswer type representing a student's response to a question.
 *
 * @category Types
 * @since 0.1.0
 */
export type StudentAnswer = Readonly<Infer<typeof StudentAnswer>>

/**
 * Raw answer types
 */
export type RawAnswer =
  | { kind: "boolean"; value: boolean }
  | { kind: "0to10"; value: number }

/**
 * Normalizes a raw answer to a 0-1 range.
 * - Boolean: false -> 0, true -> 1
 * - 0to10: value -> value/10
 *
 * @category Helpers
 * @since 0.1.0
 */
export const normalize = (rawAnswer: RawAnswer): number => {
  if (rawAnswer.kind === "boolean") {
    return rawAnswer.value ? 1 : 0
  }
  return rawAnswer.value / 10
}

/**
 * Creates a new StudentAnswer with a boolean response.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as StudentAnswer from "./schemas/StudentAnswer"
 *
 * const answer = StudentAnswer.makeBoolean({
 *   studentId: "S123456",
 *   selectionPeriodId: periodId,
 *   questionId: qId,
 *   value: true
 * })
 */
export const makeBoolean = (params: {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly questionId: Id<"questions">
  readonly value: boolean
}): StudentAnswer => {
  const rawAnswer: RawAnswer = { kind: "boolean", value: params.value }
  return {
    studentId: params.studentId,
    selectionPeriodId: params.selectionPeriodId,
    questionId: params.questionId,
    rawAnswer,
    normalizedAnswer: normalize(rawAnswer),
    answeredAt: Date.now()
  } as const
}

/**
 * Creates a new StudentAnswer with a 0-10 response.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as StudentAnswer from "./schemas/StudentAnswer"
 *
 * const answer = StudentAnswer.makeZeroToTen({
 *   studentId: "S123456",
 *   selectionPeriodId: periodId,
 *   questionId: qId,
 *   value: 8
 * })
 */
export const makeZeroToTen = (params: {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly questionId: Id<"questions">
  readonly value: number
}): StudentAnswer => {
  const rawAnswer: RawAnswer = { kind: "0to10", value: params.value }
  return {
    studentId: params.studentId,
    selectionPeriodId: params.selectionPeriodId,
    questionId: params.questionId,
    rawAnswer,
    normalizedAnswer: normalize(rawAnswer),
    answeredAt: Date.now()
  } as const
}

/**
 * Checks if an answer belongs to a student.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToStudent = (studentId: string) => (answer: StudentAnswer): boolean =>
  answer.studentId === studentId

/**
 * Checks if an answer belongs to a selection period.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToSelectionPeriod = (selectionPeriodId: Id<"selectionPeriods">) =>
  (answer: StudentAnswer): boolean =>
    answer.selectionPeriodId === selectionPeriodId

/**
 * Checks if an answer is for a specific question.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const isForQuestion = (questionId: Id<"questions">) => (answer: StudentAnswer): boolean =>
  answer.questionId === questionId

/**
 * Gets the normalized answer value (0-1 range).
 *
 * @category Getters
 * @since 0.1.0
 */
export const getNormalizedAnswer = (answer: StudentAnswer): number =>
  answer.normalizedAnswer

/**
 * Gets the raw answer value.
 *
 * @category Getters
 * @since 0.1.0
 */
export const getRawAnswer = (answer: StudentAnswer): RawAnswer =>
  answer.rawAnswer
