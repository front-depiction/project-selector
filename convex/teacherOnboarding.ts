import { query, mutation, QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import * as TeacherOnboarding from "./schemas/TeacherOnboarding"

/**
 * Gets the current onboarding progress for a visitor.
 * Also computes steps that should be auto-completed based on actual data.
 *
 * @category Queries
 * @since 0.5.0
 */
export const getOnboardingProgress = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const visitorId = args.visitorId.trim()
    if (!visitorId) return null

    // Get the onboarding record using the index
    const onboarding = await ctx.db
      .query("teacherOnboarding")
      .withIndex("by_visitorId", q => q.eq("visitorId", visitorId))
      .first()

    if (!onboarding) return null

    // Compute auto-completed steps based on actual data
    const autoCompletedSteps = await computeAutoCompletedSteps(ctx)

    // Merge manual completedSteps with auto-completed steps
    const allCompletedSteps = new Set([
      ...onboarding.completedSteps,
      ...autoCompletedSteps,
    ])

    return {
      ...onboarding,
      completedSteps: Array.from(allCompletedSteps),
      autoCompletedSteps,
    }
  }
})

/**
 * Marks a step as complete for a visitor.
 * Creates the onboarding record if it doesn't exist.
 *
 * @category Mutations
 * @since 0.5.0
 */
export const markStepComplete = mutation({
  args: {
    visitorId: v.string(),
    stepId: v.string(),
  },
  handler: async (ctx, args) => {
    const visitorId = args.visitorId.trim()
    if (!visitorId) {
      throw new Error("visitorId is required")
    }

    // Get existing onboarding record using the index
    const existing = await ctx.db
      .query("teacherOnboarding")
      .withIndex("by_visitorId", q => q.eq("visitorId", visitorId))
      .first()

    if (existing) {
      // Add stepId to completedSteps if not already present
      if (!existing.completedSteps.includes(args.stepId)) {
        await ctx.db.patch(existing._id, {
          completedSteps: [...existing.completedSteps, args.stepId],
          lastUpdated: Date.now(),
        })
      }
      return { success: true }
    }

    // Create new onboarding record using the schema helper
    await ctx.db.insert("teacherOnboarding", TeacherOnboarding.make({
      visitorId,
      completedSteps: [args.stepId],
    }))

    return { success: true }
  }
})

/**
 * Dismisses the onboarding for a visitor.
 * Sets the dismissedAt timestamp.
 *
 * @category Mutations
 * @since 0.5.0
 */
export const dismissOnboarding = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const visitorId = args.visitorId.trim()
    if (!visitorId) {
      throw new Error("visitorId is required")
    }

    // Get existing onboarding record using the index
    const existing = await ctx.db
      .query("teacherOnboarding")
      .withIndex("by_visitorId", q => q.eq("visitorId", visitorId))
      .first()

    if (existing) {
      // Use the schema helper to dismiss
      const dismissed = TeacherOnboarding.dismiss(existing)
      await ctx.db.patch(existing._id, {
        dismissedAt: dismissed.dismissedAt,
        lastUpdated: dismissed.lastUpdated,
      })
      return { success: true }
    }

    // Create new onboarding record with dismissed state
    const newOnboarding = TeacherOnboarding.dismiss(
      TeacherOnboarding.make({ visitorId })
    )
    await ctx.db.insert("teacherOnboarding", newOnboarding)

    return { success: true }
  }
})

/**
 * Computes the onboarding status by checking actual data.
 * Counts topics, questions, periods, and students to auto-detect completed steps.
 *
 * @category Queries
 * @since 0.5.0
 */
export const computeOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    // Count data in parallel
    const [topics, questions, periods, students, assignments] = await Promise.all([
      ctx.db.query("topics").collect(),
      ctx.db.query("questions").collect(),
      ctx.db.query("selectionPeriods").collect(),
      ctx.db.query("periodStudentAllowList").collect(),
      ctx.db.query("assignments").collect(),
    ])

    const completedSteps: string[] = []

    // Auto-detect completed steps based on data existence
    if (topics.length > 0) {
      completedSteps.push("create_topics")
    }

    if (questions.length > 0) {
      completedSteps.push("create_questions")
    }

    if (periods.length > 0) {
      completedSteps.push("create_period")
    }

    if (students.length > 0) {
      completedSteps.push("add_students")
    }

    if (assignments.length > 0) {
      completedSteps.push("run_assignment")
    }

    const totalSteps = TeacherOnboarding.ONBOARDING_STEPS.length
    const isComplete = completedSteps.length >= totalSteps

    return {
      completedSteps,
      totalSteps,
      isComplete,
      counts: {
        topics: topics.length,
        questions: questions.length,
        periods: periods.length,
        students: students.length,
        assignments: assignments.length,
      },
    }
  }
})

/**
 * Helper function to compute auto-completed steps based on actual data.
 * Used internally by getOnboardingProgress.
 */
async function computeAutoCompletedSteps(ctx: QueryCtx): Promise<string[]> {
  const [topics, questions, periods, students, assignments] = await Promise.all([
    ctx.db.query("topics").collect(),
    ctx.db.query("questions").collect(),
    ctx.db.query("selectionPeriods").collect(),
    ctx.db.query("periodStudentAllowList").collect(),
    ctx.db.query("assignments").collect(),
  ])

  const autoCompleted: string[] = []

  if (topics.length > 0) {
    autoCompleted.push("create_topics")
  }

  if (questions.length > 0) {
    autoCompleted.push("create_questions")
  }

  if (periods.length > 0) {
    autoCompleted.push("create_period")
  }

  if (students.length > 0) {
    autoCompleted.push("add_students")
  }

  if (assignments.length > 0) {
    autoCompleted.push("run_assignment")
  }

  return autoCompleted
}
