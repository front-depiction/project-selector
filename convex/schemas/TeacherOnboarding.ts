import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Onboarding step identifiers.
 *
 * @category Types
 * @since 0.3.0
 */
export type OnboardingStep =
  | "create_topics"
  | "create_questions"
  | "create_period"
  | "add_students"
  | "run_assignment"

/**
 * All available onboarding steps in order.
 *
 * @category Constants
 * @since 0.3.0
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "create_topics",
  "create_questions",
  "create_period",
  "add_students",
  "run_assignment",
] as const

/**
 * Convex validator for TeacherOnboarding objects.
 * Tracks which onboarding steps a teacher has completed.
 *
 * @category Validators
 * @since 0.3.0
 */
export const TeacherOnboarding = v.object({
  visitorId: v.string(),  // Could be visitorId or email, unique per teacher/visitor
  completedSteps: v.array(v.string()),  // Array of step IDs completed
  dismissedAt: v.optional(v.number()),  // Timestamp if user dismissed onboarding
  lastUpdated: v.number(),
})

/**
 * TeacherOnboarding type representing a teacher's onboarding progress.
 *
 * @category Types
 * @since 0.3.0
 */
export type TeacherOnboarding = Readonly<Infer<typeof TeacherOnboarding>>

/**
 * Creates a new TeacherOnboarding record.
 *
 * @category Constructors
 * @since 0.3.0
 * @example
 * import * as TeacherOnboarding from "./schemas/TeacherOnboarding"
 *
 * const onboarding = TeacherOnboarding.make({
 *   visitorId: "teacher@example.com"
 * })
 */
export const make = (params: {
  readonly visitorId: string
  readonly completedSteps?: readonly string[]
}): TeacherOnboarding => ({
  visitorId: params.visitorId,
  completedSteps: params.completedSteps ? [...params.completedSteps] : [],
  dismissedAt: undefined,
  lastUpdated: Date.now(),
})

/**
 * Marks a step as completed.
 *
 * @category Combinators
 * @since 0.3.0
 */
export const completeStep = (step: OnboardingStep) => (onboarding: TeacherOnboarding): TeacherOnboarding => {
  if (onboarding.completedSteps.includes(step)) {
    return onboarding
  }
  return {
    ...onboarding,
    completedSteps: [...onboarding.completedSteps, step],
    lastUpdated: Date.now(),
  }
}

/**
 * Dismisses the onboarding UI.
 *
 * @category Combinators
 * @since 0.3.0
 */
export const dismiss = (onboarding: TeacherOnboarding): TeacherOnboarding => ({
  ...onboarding,
  dismissedAt: Date.now(),
  lastUpdated: Date.now(),
})

/**
 * Checks if a specific step has been completed.
 *
 * @category Predicates
 * @since 0.3.0
 */
export const hasCompletedStep = (step: OnboardingStep) => (onboarding: TeacherOnboarding): boolean =>
  onboarding.completedSteps.includes(step)

/**
 * Checks if all onboarding steps have been completed.
 *
 * @category Predicates
 * @since 0.3.0
 */
export const isComplete = (onboarding: TeacherOnboarding): boolean =>
  ONBOARDING_STEPS.every(step => onboarding.completedSteps.includes(step))

/**
 * Checks if onboarding has been dismissed.
 *
 * @category Predicates
 * @since 0.3.0
 */
export const isDismissed = (onboarding: TeacherOnboarding): boolean =>
  onboarding.dismissedAt !== undefined

/**
 * Gets the next incomplete step, if any.
 *
 * @category Getters
 * @since 0.3.0
 */
export const getNextStep = (onboarding: TeacherOnboarding): OnboardingStep | undefined =>
  ONBOARDING_STEPS.find(step => !onboarding.completedSteps.includes(step))

/**
 * Gets the completion progress as a ratio (0 to 1).
 *
 * @category Getters
 * @since 0.3.0
 */
export const getProgress = (onboarding: TeacherOnboarding): number =>
  onboarding.completedSteps.filter(step =>
    ONBOARDING_STEPS.includes(step as OnboardingStep)
  ).length / ONBOARDING_STEPS.length
