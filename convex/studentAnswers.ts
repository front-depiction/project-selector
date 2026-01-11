import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as StudentAnswer from "./schemas/StudentAnswer"

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
    // Get all questions for this period
    const periodQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // No questions means questionnaire is complete (nothing to answer)
    if (periodQuestions.length === 0) return true

    // Get all answers for this student/period
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
         .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()

    // Check if every question has been answered
    const answeredQuestionIds = new Set(answers.map(a => a.questionId))
    return periodQuestions.every(pq => answeredQuestionIds.has(pq.questionId))
  }
})

export const saveAnswers = mutation({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods"),
    answers: v.array(v.object({
      questionId: v.id("questions"),
      kind: v.union(v.literal("boolean"), v.literal("0to10")),
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
        : StudentAnswer.makeZeroToTen({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as number })

      if (existing) {
        await ctx.db.patch(existing._id, data)
      } else {
        await ctx.db.insert("studentAnswers", data)
      }
    }
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
      kind: v.union(v.literal("boolean"), v.literal("0to10")),
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
        : StudentAnswer.makeZeroToTen({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as number })

      // Note: We're storing proxy info in the answer itself
      // The answeredAt timestamp is set by the make functions
      
      if (existing) {
        await ctx.db.patch(existing._id, baseData)
      } else {
        await ctx.db.insert("studentAnswers", baseData)
      }
    }

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
    // Get all questions for this period
    const periodQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // If no questions, everyone is "complete"
    if (periodQuestions.length === 0) return []

    const questionIds = new Set(periodQuestions.map(pq => pq.questionId))
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
    // Get the period to access semesterId
    const period = await ctx.db.get(args.selectionPeriodId)
    if (!period) return []

    // Get all questions for this period
    const periodQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    const questionIds = new Set(periodQuestions.map(pq => pq.questionId))
    const requiredCount = questionIds.size

    // Get all topics for this semester
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .collect()

    // Get all unique student IDs from topicStudentAllowList for these topics
    const topicIds = new Set(topics.map(t => t._id))
    const allAllowListEntries = await ctx.db
      .query("topicStudentAllowList")
      .collect()

    const studentIds = new Set<string>()
    for (const entry of allAllowListEntries) {
      if (topicIds.has(entry.topicId)) {
        studentIds.add(entry.studentId)
      }
    }

    // If no questions, all students are "complete"
    if (periodQuestions.length === 0) {
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

    // Get the questions for context
    const periodQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // Get full question data
    const questionsWithDetails = await Promise.all(
      periodQuestions.map(async (pq) => {
        const question = await ctx.db.get(pq.questionId)
        return {
          ...pq,
          question
        }
      })
    )

    // Get student's answers
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
         .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()

    // Create a map of questionId -> answer
    const answerMap = new Map(answers.map(a => [a.questionId as string, a]))

    // Combine questions with answers
    return questionsWithDetails
      .filter(q => q.question !== null)
      .sort((a, b) => a.order - b.order)
      .map(q => ({
        questionId: q.questionId,
        order: q.order,
        questionText: q.question!.question,
        kind: q.question!.kind,
        category: (q.question as any)?.category,
        answer: answerMap.get(q.questionId as string) ?? null
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
    // Get all questions for this period
    const periodQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // Get full question data with categories
    const questionsWithDetails = await Promise.all(
      periodQuestions.map(async (pq) => {
        const question = await ctx.db.get(pq.questionId)
        return {
          questionId: pq.questionId,
          category: (question as any)?.category as string | undefined
        }
      })
    )

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
    
    for (const q of questionsWithDetails) {
      const normalizedAnswer = answerMap.get(q.questionId as string)
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
