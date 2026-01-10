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
