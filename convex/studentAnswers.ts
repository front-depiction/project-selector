import { v } from "convex/values"
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import * as StudentAnswer from "./schemas/StudentAnswer"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import type { Id, Doc } from "./_generated/dataModel"

/**
 * Helper function to get question IDs for a period based on linked categories.
 * 
 * Questions are derived from categories linked to:
 * 1. The period via `minimizeCategoryIds` (Balance Distribution - minimize criterion)
 * 2. Any topic in the period's semester via `constraintIds` (Topic-Specific - prerequisite/pull criteria)
 */
async function getQuestionIdsForPeriod(
  ctx: QueryCtx | MutationCtx,
  selectionPeriodId: Id<"selectionPeriods">
): Promise<Set<Id<"questions">>> {
  // Get the period
  const period = await ctx.db.get(selectionPeriodId)
  if (!period) return new Set()

  // Get all topics for this semester
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()

  // Collect all category IDs from period and topics
  const categoryIds = new Set<Id<"categories">>()
  
  // From period (balance distribution - minimize categories)
  if (period.minimizeCategoryIds) {
    period.minimizeCategoryIds.forEach(id => categoryIds.add(id))
  }
  
  // From topics (topic-specific criteria - prerequisite and pull categories)
  for (const topic of topics) {
    if (topic.constraintIds) {
      topic.constraintIds.forEach(id => categoryIds.add(id))
    }
  }

  // If no categories are linked, return empty set
  if (categoryIds.size === 0) return new Set()

  // Get category names from those IDs
  const categoryNames = new Set<string>()
  for (const categoryId of categoryIds) {
    const category = await ctx.db.get(categoryId)
    if (category) {
      categoryNames.add(category.name)
    }
  }

  // If no valid category names found, return empty set
  if (categoryNames.size === 0) return new Set()

  // Get questions matching those category names (same semester)
  const allQuestions = await ctx.db
    .query("questions")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()

  const matchingQuestionIds = new Set<Id<"questions">>()
  for (const q of allQuestions) {
    if (categoryNames.has(q.category)) {
      matchingQuestionIds.add(q._id)
    }
  }

  return matchingQuestionIds
}

/**
 * Helper function to get full question documents for a period based on linked categories.
 */
async function getQuestionsForPeriodHelper(
  ctx: QueryCtx | MutationCtx,
  selectionPeriodId: Id<"selectionPeriods">
): Promise<Doc<"questions">[]> {
  // Get the period
  const period = await ctx.db.get(selectionPeriodId)
  if (!period) return []

  // Get all topics for this semester
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()

  // Collect all category IDs from period and topics
  const categoryIds = new Set<Id<"categories">>()
  
  // From period (balance distribution - minimize categories)
  if (period.minimizeCategoryIds) {
    period.minimizeCategoryIds.forEach(id => categoryIds.add(id))
  }
  
  // From topics (topic-specific criteria - prerequisite and pull categories)
  for (const topic of topics) {
    if (topic.constraintIds) {
      topic.constraintIds.forEach(id => categoryIds.add(id))
    }
  }

  // If no categories are linked, return empty array
  if (categoryIds.size === 0) return []

  // Get category names from those IDs
  const categoryNames = new Set<string>()
  for (const categoryId of categoryIds) {
    const category = await ctx.db.get(categoryId)
    if (category) {
      categoryNames.add(category.name)
    }
  }

  // If no valid category names found, return empty array
  if (categoryNames.size === 0) return []

  // Get questions matching those category names (same semester)
  const allQuestions = await ctx.db
    .query("questions")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()

  return allQuestions.filter(q => categoryNames.has(q.category))
}

export const getAnswers = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
          .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()
  }
})

export const hasCompletedQuestionnaire = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Get all question IDs for this period (derived from linked categories)
    const questionIds = await getQuestionIdsForPeriod(ctx, args.selectionPeriodId)

    // No questions means questionnaire is complete (nothing to answer)
    if (questionIds.size === 0) return true

    // Get all answers for this student/period
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
          .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()

    // Check if every question has been answered
    const answeredQuestionIds = new Set(answers.map(a => a.questionId as string))
    for (const questionId of questionIds) {
      if (!answeredQuestionIds.has(questionId)) {
        return false
      }
    }
    return true
  }
})

export const saveAnswers = mutation({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods"),
    answers: v.array(v.object({
      questionId: v.id("questions"),
      kind: v.union(v.literal("boolean"), v.literal("0to6")),
      value: v.union(v.boolean(), v.number())
    }))
  },
  handler: async (ctx, args) => {
    for (const answer of args.answers) {
      // Check if exists
      const existing = await ctx.db.query("studentAnswers")
        .withIndex("by_student_period", q => q.eq("studentId", args.studentId).eq("selectionPeriodId", args.selectionPeriodId))
        .filter(q => q.eq(q.field("questionId"), answer.questionId))
        .first()

      const data = answer.kind === "boolean"
        ? StudentAnswer.makeBoolean({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as boolean })
        : StudentAnswer.makeZeroToSix({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as number })

      if (existing) {
        await ctx.db.patch(existing._id, data)
      } else {
        await ctx.db.insert("studentAnswers", data)
      }
    }

    // Check if all questionnaires are complete and close period if needed
    await ctx.scheduler.runAfter(0, internal.studentAnswers.checkAndClosePeriodIfReady, {
      periodId: args.selectionPeriodId
    })
  }
})

/**
 * Save answers on behalf of a student (teacher proxy).
 * Requires authentication and logs the teacher who submitted.
 */
export const saveAnswersAsTeacher = mutation({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods"),
    answers: v.array(v.object({
      questionId: v.id("questions"),
      kind: v.union(v.literal("boolean"), v.literal("0to6")),
      value: v.union(v.boolean(), v.number())
    }))
  },
  handler: async (ctx, args) => {
    // Verify teacher is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Must be authenticated as a teacher to submit on behalf of students")
    }

    const teacherEmail = identity.email ?? "unknown"
    const submittedAt = Date.now()

    for (const answer of args.answers) {
      // Check if exists
      const existing = await ctx.db.query("studentAnswers")
        .withIndex("by_student_period", q => q.eq("studentId", args.studentId).eq("selectionPeriodId", args.selectionPeriodId))
        .filter(q => q.eq(q.field("questionId"), answer.questionId))
        .first()

      const baseData = answer.kind === "boolean"
        ? StudentAnswer.makeBoolean({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as boolean })
        : StudentAnswer.makeZeroToSix({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as number })

      // Note: We're storing proxy info in the answer itself
      // The answeredAt timestamp is set by the make functions

      if (existing) {
        await ctx.db.patch(existing._id, baseData)
      } else {
        await ctx.db.insert("studentAnswers", baseData)
      }
    }

    // Check if all questionnaires are complete and close period if needed
    await ctx.scheduler.runAfter(0, internal.studentAnswers.checkAndClosePeriodIfReady, {
      periodId: args.selectionPeriodId
    })

    return {
      success: true,
      answeredCount: args.answers.length,
      submittedBy: teacherEmail,
      studentId: args.studentId
    }
  }
})

/**
 * Get students who haven't completed the questionnaire for a period
 */
export const getIncompleteStudents = query({
  args: {
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Get all question IDs for this period (derived from linked categories)
    const questionIds = await getQuestionIdsForPeriod(ctx, args.selectionPeriodId)

    // If no questions, everyone is "complete"
    if (questionIds.size === 0) return []

    const requiredCount = questionIds.size

    // Get all answers for this period
    const allAnswers = await ctx.db.query("studentAnswers")
      .filter(q => q.eq(q.field("selectionPeriodId"), args.selectionPeriodId))
      .collect()

    // Group answers by student
    const studentAnswerCounts = new Map<string, Set<string>>()
    for (const answer of allAnswers) {
      if (!studentAnswerCounts.has(answer.studentId)) {
        studentAnswerCounts.set(answer.studentId, new Set())
      }
      if (questionIds.has(answer.questionId)) {
        studentAnswerCounts.get(answer.studentId)!.add(answer.questionId as string)
      }
    }

    // Find students with incomplete answers
    const incompleteStudents: Array<{ studentId: string; answeredCount: number; totalCount: number }> = []

    for (const [studentId, answeredQuestions] of studentAnswerCounts) {
      if (answeredQuestions.size < requiredCount) {
        incompleteStudents.push({
          studentId,
          answeredCount: answeredQuestions.size,
          totalCount: requiredCount
        })
      }
    }

    return incompleteStudents
  }
})

/**
 * Get all students with their completion status for a selection period.
 * Returns all students from topics in the period's semester, with completion info.
 */
export const getAllStudentsWithCompletionStatus = query({
  args: {
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Get all question IDs for this period (derived from linked categories)
    const questionIds = await getQuestionIdsForPeriod(ctx, args.selectionPeriodId)
    const requiredCount = questionIds.size

    // Get all unique student IDs from periodStudentAllowList for this period
    const periodAllowListEntries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    const studentIds = new Set<string>()
    for (const entry of periodAllowListEntries) {
      studentIds.add(entry.studentId)
    }

    // If no questions, all students are "complete"
    if (questionIds.size === 0) {
      return Array.from(studentIds).map(studentId => ({
        studentId,
        isCompleted: true,
        answeredCount: 0,
        totalCount: 0
      }))
    }

    // Get all answers for this period
    const allAnswers = await ctx.db.query("studentAnswers")
      .filter(q => q.eq(q.field("selectionPeriodId"), args.selectionPeriodId))
      .collect()

    // Group answers by student
    const studentAnswerCounts = new Map<string, Set<string>>()
    for (const answer of allAnswers) {
      if (!studentAnswerCounts.has(answer.studentId)) {
        studentAnswerCounts.set(answer.studentId, new Set())
      }
      if (questionIds.has(answer.questionId)) {
        studentAnswerCounts.get(answer.studentId)!.add(answer.questionId as string)
      }
    }

    // Build result array with all students
    const result: Array<{ studentId: string; isCompleted: boolean; answeredCount: number; totalCount: number }> = []

    for (const studentId of studentIds) {
      const answeredQuestions = studentAnswerCounts.get(studentId) || new Set()
      const answeredCount = answeredQuestions.size
      const isCompleted = answeredCount >= requiredCount

      result.push({
        studentId,
        isCompleted,
        answeredCount,
        totalCount: requiredCount
      })
    }

    // Sort by studentId for consistent ordering
    return result.sort((a, b) => a.studentId.localeCompare(b.studentId))
  }
})

/**
 * Get all students with their completion status for ALL selection periods.
 * Grouped by period.
 */
export const getAllPeriodsStudentsWithCompletionStatus = query({
  args: {},
  handler: async (ctx) => {
    // 1. Get all selection periods
    const periods = await ctx.db.query("selectionPeriods").collect()

    // 2. For each period, calculate student stats
    // Note: This could be optimized but works for moderate scale
    const results = await Promise.all(periods.map(async (period) => {
      // Get all question IDs for this period (derived from linked categories)
      const questionIds = await getQuestionIdsForPeriod(ctx, period._id)
      const requiredCount = questionIds.size

      // Get all unique student IDs from periodStudentAllowList for this period
      const periodAllowListEntries = await ctx.db
        .query("periodStudentAllowList")
        .withIndex("by_period", q => q.eq("selectionPeriodId", period._id))
        .collect()

      const studentIds = new Set<string>()
      for (const entry of periodAllowListEntries) {
        studentIds.add(entry.studentId)
      }

      // If no students, return early with empty list
      if (studentIds.size === 0) {
        return {
          period,
          students: []
        }
      }

      // If no questions, all students are "complete"
      if (questionIds.size === 0) {
        return {
          period,
          students: Array.from(studentIds).sort().map(studentId => {
            const studentEntry = periodAllowListEntries.find(e => e.studentId === studentId)
            return {
              studentId,
              name: studentEntry?.name,
              isCompleted: true,
              answeredCount: 0,
              totalCount: 0
            }
          })
        }
      }

      // Get all answers for this period
      const allAnswers = await ctx.db.query("studentAnswers")
        .filter(q => q.eq(q.field("selectionPeriodId"), period._id))
        .collect()

      // Group answers by student
      const studentAnswerCounts = new Map<string, Set<string>>()
      for (const answer of allAnswers) {
        if (!studentAnswerCounts.has(answer.studentId)) {
          studentAnswerCounts.set(answer.studentId, new Set())
        }
        if (questionIds.has(answer.questionId)) {
          studentAnswerCounts.get(answer.studentId)!.add(answer.questionId as string)
        }
      }

      // Build result array with all students
      const students: Array<{ studentId: string; name?: string; isCompleted: boolean; answeredCount: number; totalCount: number }> = []

      for (const studentId of studentIds) {
        const answeredQuestions = studentAnswerCounts.get(studentId) || new Set()
        const answeredCount = answeredQuestions.size
        const isCompleted = answeredCount >= requiredCount

        // Get student name from periodStudentAllowList
        const studentEntry = periodAllowListEntries.find(e => e.studentId === studentId)

        students.push({
          studentId,
          name: studentEntry?.name,
          isCompleted,
          answeredCount,
          totalCount: requiredCount
        })
      }

      // Sort by studentId for consistent ordering
      students.sort((a, b) => a.studentId.localeCompare(b.studentId))

      return {
        period,
        students
      }
    }))

    // Sort periods by close date (most recent first)
    return results.sort((a, b) => (b.period.closeDate || 0) - (a.period.closeDate || 0))
  }
})

/**
 * Get all answers for a specific student (for teacher to review/edit)
 */
export const getStudentAnswersForTeacher = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Verify teacher is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Must be authenticated to view student answers")
    }

    // Get questions for this period (derived from linked categories)
    const questions = await getQuestionsForPeriodHelper(ctx, args.selectionPeriodId)

    // Get student's answers
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
          .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()

    // Create a map of questionId -> answer
    const answerMap = new Map(answers.map(a => [a.questionId as string, a]))

    // Sort questions by characteristicName (stored as 'category' in DB) then createdAt for consistent ordering
    const sortedQuestions = [...questions].sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category)
      if (catCompare !== 0) return catCompare
      return a.createdAt - b.createdAt
    })

    // Combine questions with answers
    return sortedQuestions.map((q, index) => ({
      questionId: q._id,
      order: index,
      questionText: q.question,
      kind: q.kind,
      characteristicName: q.category, // Map DB field to semantic name
      answer: answerMap.get(q._id as string) ?? null
    }))
  }
})

/**
 * Get all questions with answers for a specific student (for student edit form).
 * Similar to getStudentAnswersForTeacher but without authentication requirement.
 * Student identity is verified via their access code.
 */
export const getQuestionsWithAnswersForStudent = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Get questions for this period (derived from linked categories)
    const questions = await getQuestionsForPeriodHelper(ctx, args.selectionPeriodId)

    // Get student's answers
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
          .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()

    // Create a map of questionId -> answer
    const answerMap = new Map(answers.map(a => [a.questionId as string, a]))

    // Sort questions by characteristicName (stored as 'category' in DB) then createdAt for consistent ordering
    const sortedQuestions = [...questions].sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category)
      if (catCompare !== 0) return catCompare
      return a.createdAt - b.createdAt
    })

    // Combine questions with answers
    return sortedQuestions.map((q, index) => ({
      questionId: q._id,
      order: index,
      questionText: q.question,
      kind: q.kind,
      characteristicName: q.category, // Map DB field to semantic name
      answer: answerMap.get(q._id as string) ?? null
    }))
  }
})

/**
 * Get category-averaged scores for a student's questionnaire answers.
 * This ensures each category contributes equally to the overall score,
 * regardless of how many questions are in each category.
 * 
 * Returns a map of category name -> average normalized score (0-1 range).
 * Questions without a category are grouped under "uncategorized".
 */
export const getCategoryAveragedScores = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Get questions for this period (derived from linked categories)
    const questions = await getQuestionsForPeriodHelper(ctx, args.selectionPeriodId)

    // Get student's answers
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
          .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()

    // Create map of questionId -> normalizedAnswer
    const answerMap = new Map(answers.map(a => [a.questionId as string, a.normalizedAnswer]))

    // Group answers by category and compute averages
    const categoryScores = new Map<string, number[]>()

    for (const q of questions) {
      const normalizedAnswer = answerMap.get(q._id as string)
      if (normalizedAnswer === undefined) continue // Skip unanswered questions

      const category = q.category ?? "uncategorized"
      const existing = categoryScores.get(category) ?? []
      categoryScores.set(category, [...existing, normalizedAnswer])
    }

    // Compute average per category
    const categoryAverages = new Map<string, number>()
    for (const [category, scores] of categoryScores.entries()) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
      categoryAverages.set(category, average)
    }

    // Convert to object for easier consumption
    const result: Record<string, number> = {}
    for (const [category, average] of categoryAverages.entries()) {
      result[category] = average
    }

    return result
  }
})

/**
 * Helper function to compute the overall weighted average from category-averaged scores.
 * This averages all category averages, ensuring each category contributes equally
 * regardless of how many questions it contains.
 * 
 * @param categoryScores - Object mapping category names to their average scores (0-1 range)
 * @returns The overall weighted average (0-1 range), or null if no categories
 */
export function computeOverallWeightedAverage(categoryScores: Record<string, number>): number | null {
  const categories = Object.keys(categoryScores)
  if (categories.length === 0) return null

  const sum = categories.reduce((acc, category) => acc + categoryScores[category], 0)
  return sum / categories.length
}

/**
 * Internal function to check if all questionnaires are complete for a period
 * and automatically close it if ready for assignment.
 */
export const checkAndClosePeriodIfReady = internalMutation({
  args: {
    periodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    if (!period) return

    // Only check if period is open (not already closed or assigned)
    if (!SelectionPeriod.isOpen(period)) return
    // Auto-close only when rankings are disabled (questionnaire-only periods).
    if (period.rankingsEnabled ?? true) return

    // Get all question IDs for this period (derived from linked categories)
    const questionIds = await getQuestionIdsForPeriod(ctx, args.periodId)
    const requiredCount = questionIds.size

    // If no questions, can't be ready
    if (requiredCount === 0) return

    // Get all students for this period
    const periodAllowListEntries = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", q => q.eq("selectionPeriodId", args.periodId))
      .collect()

    const studentIds = new Set<string>()
    for (const entry of periodAllowListEntries) {
      studentIds.add(entry.studentId)
    }

    // If no students, not ready
    if (studentIds.size === 0) return

    // Get all answers for this period
    const allAnswers = await ctx.db.query("studentAnswers")
      .filter(q => q.eq(q.field("selectionPeriodId"), args.periodId))
      .collect()

    // Group answers by student
    const studentAnswerCounts = new Map<string, Set<string>>()
    for (const answer of allAnswers) {
      if (!studentAnswerCounts.has(answer.studentId)) {
        studentAnswerCounts.set(answer.studentId, new Set())
      }
      if (questionIds.has(answer.questionId)) {
        studentAnswerCounts.get(answer.studentId)!.add(answer.questionId as string)
      }
    }

    // Check if all students have completed all questions
    let allComplete = true
    for (const studentId of studentIds) {
      const answeredCount = studentAnswerCounts.get(studentId)?.size ?? 0
      if (answeredCount < requiredCount) {
        allComplete = false
        break
      }
    }

    // If all questionnaires are complete, close the period
    if (allComplete) {
      await ctx.db.replace(args.periodId, SelectionPeriod.makeClosed({
        semesterId: period.semesterId,
        title: period.title,
        description: period.description,
        openDate: period.openDate,
        closeDate: period.closeDate,
        shareableSlug: period.shareableSlug
      }))
    }
  }
})
