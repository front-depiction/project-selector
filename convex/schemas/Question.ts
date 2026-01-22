import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Boolean question variant
 *
 * Note: The database field is named `category` but in TypeScript we use
 * `characteristicName` to better describe its purpose (linking to Category entities).
 */
export const BooleanQuestion = v.object({
  question: v.string(),
  kind: v.literal("boolean"),
  category: v.string(), // DB field name; represents characteristicName (e.g., "Technical Skills", "Soft Skills")
  semesterId: v.string(),
  createdAt: v.number(),
})

/**
 * 0-to-6 rating question variant
 *
 * Note: The database field is named `category` but in TypeScript we use
 * `characteristicName` to better describe its purpose (linking to Category entities).
 */
export const ZeroToSixQuestion = v.object({
  question: v.string(),
  kind: v.literal("0to6"),
  category: v.string(), // DB field name; represents characteristicName (e.g., "Technical Skills", "Soft Skills")
  semesterId: v.string(),
  createdAt: v.number(),
})

/**
 * Convex validator for Question objects.
 *
 * @category Validators
 * @since 0.1.0
 */
export const Question = v.union(
  BooleanQuestion,
  ZeroToSixQuestion
)

/**
 * Question type representing a questionnaire question.
 *
 * @category Types
 * @since 0.1.0
 */
export type Question = Readonly<Infer<typeof Question>>
export type BooleanQuestion = Readonly<Infer<typeof BooleanQuestion>>
export type ZeroToSixQuestion = Readonly<Infer<typeof ZeroToSixQuestion>>

/**
 * Creates a new Question.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as Question from "./schemas/Question"
 *
 * const question = Question.make({
 *   question: "Do you enjoy working in teams?",
 *   kind: "boolean",
 *   characteristicName: "Soft Skills",
 *   semesterId: "2024-spring"
 * })
 */
export const make = (params: {
  readonly question: string
  readonly kind: "boolean" | "0to6"
  /** The characteristic/category name this question belongs to */
  readonly characteristicName: string
  readonly semesterId: string
  readonly createdAt?: number
}): Question => ({
  question: params.question,
  kind: params.kind,
  category: params.characteristicName, // Map to DB field name
  semesterId: params.semesterId,
  createdAt: params.createdAt ?? Date.now()
} as const)

/**
 * Gets the characteristic name from a Question.
 * This is a helper to access the `category` DB field with the semantic name.
 *
 * @category Accessors
 * @since 0.1.0
 */
export const getCharacteristicName = (question: Question): string => question.category

/**
 * Type guards with narrowing
 *
 * @category Predicates
 * @since 0.1.0
 */
export const isBoolean = <Q extends Question>(question: Q): question is Extract<Q, BooleanQuestion> =>
  question.kind === "boolean"

export const isZeroToSix = <Q extends Question>(question: Q): question is Extract<Q, ZeroToSixQuestion> =>
  question.kind === "0to6"

/**
 * Checks if a question belongs to a semester.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const belongsToSemester = (semesterId: string) => (question: Question): boolean =>
  question.semesterId === semesterId

/**
 * Pattern matching helper for Question ADT.
 *
 * @category Pattern Matching
 * @since 0.1.0
 * @example
 * import * as Question from "./schemas/Question"
 *
 * const result = Question.match(question)({
 *   boolean: (q) => `Yes/No: ${q.question}`,
 *   "0to6": (q) => `Rate 0-6: ${q.question}`
 * })
 */
export const match = <Q extends Question>(question: Q) =>
  <R>(patterns: {
    boolean: (q: Extract<Q, BooleanQuestion>) => R
    "0to6": (q: Extract<Q, ZeroToSixQuestion>) => R
  }): R => {
    switch (question.kind) {
      case "boolean": return patterns.boolean(question as Extract<Q, BooleanQuestion>)
      case "0to6": return patterns["0to6"](question as Extract<Q, ZeroToSixQuestion>)
    }
  }

/**
 * Pattern matching for optional Question (handles undefined/null).
 *
 * @category Pattern Matching
 * @since 0.1.0
 * @example
 * import * as Question from "./schemas/Question"
 *
 * const result = Question.matchOptional(question)({
 *   boolean: (q) => `Yes/No: ${q.question}`,
 *   "0to6": (q) => `Rate 0-6: ${q.question}`,
 *   none: () => "No question found"
 * })
 */
export const matchOptional = <Q extends Question>(question: Q | undefined | null) =>
  <R>(patterns: {
    boolean: (q: Extract<Q, BooleanQuestion>) => R
    "0to6": (q: Extract<Q, ZeroToSixQuestion>) => R
    none: () => R
  }): R => question ? match(question)(patterns) : patterns.none()

/**
 * Fold over the ADT structure.
 *
 * @category Pattern Matching
 * @since 0.1.0
 */
export const fold = <R>(cases: {
  boolean: (q: BooleanQuestion) => R
  "0to6": (q: ZeroToSixQuestion) => R
}) => (question: Question): R => match(question)(cases)

/**
 * Array refinement helpers for filtering collections of Questions.
 *
 * @category Array Refinements
 * @since 0.1.0
 */

/**
 * Filters an array to only include boolean questions.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const booleanQuestions = getBooleans(allQuestions)
 */
export const getBooleans = <Q extends Question>(questions: readonly Q[]): Extract<Q, BooleanQuestion>[] =>
  questions.filter(isBoolean)

/**
 * Filters an array to only include 0-to-6 questions.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const ratingQuestions = getZeroToSixes(allQuestions)
 */
export const getZeroToSixes = <Q extends Question>(questions: readonly Q[]): Extract<Q, ZeroToSixQuestion>[] =>
  questions.filter(isZeroToSix)

/**
 * Filters questions by semester.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const springQuestions = filterBySemester("2024-spring")(allQuestions)
 */
export const filterBySemester = (semesterId: string) =>
  <Q extends Question>(questions: readonly Q[]): Q[] =>
    questions.filter(belongsToSemester(semesterId))

/**
 * Groups questions by semester.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const grouped = groupBySemester(allQuestions)
 */
export const groupBySemester = <Q extends Question>(
  questions: readonly Q[]
): ReadonlyMap<string, readonly Q[]> => {
  const map = new Map<string, Q[]>()
  for (const question of questions) {
    const existing = map.get(question.semesterId) || []
    map.set(question.semesterId, [...existing, question])
  }
  return map
}

/**
 * Sorts questions by creation date (descending).
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const sorted = sortByCreatedAtDesc(allQuestions)
 */
export const sortByCreatedAtDesc = <Q extends Question>(questions: readonly Q[]): Q[] =>
  [...questions].sort((a, b) => b.createdAt - a.createdAt)

/**
 * Sorts questions by creation date (ascending).
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const sorted = sortByCreatedAtAsc(allQuestions)
 */
export const sortByCreatedAtAsc = <Q extends Question>(questions: readonly Q[]): Q[] =>
  [...questions].sort((a, b) => a.createdAt - b.createdAt)
