import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as SelectionQuestion from "./schemas/SelectionQuestion"
import type { Id } from "./_generated/dataModel"

/**
 * Gets questions for a selection period.
 *
 * Questions come from two sources:
 * 1. Explicitly linked via selectionQuestions table (added via addQuestion mutation)
 * 2. Derived from linked categories (minimizeCategoryIds on period, constraintIds on topics)
 */
export const getQuestionsForPeriod = query({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    // 1. Get explicitly linked questions from selectionQuestions table
    const explicitLinks = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // Track which question IDs we've already included
    const includedQuestionIds = new Set<string>()
    const results: Array<{
      _id: Id<"selectionQuestions">
      _creationTime: number
      selectionPeriodId: Id<"selectionPeriods">
      questionId: Id<"questions">
      order: number
      sourceTemplateId: Id<"questionTemplates"> | undefined
      question: any
    }> = []

    // Add explicitly linked questions first (they have defined order)
    for (const link of explicitLinks.sort((a, b) => a.order - b.order)) {
      const question = await ctx.db.get(link.questionId)
      if (question) {
        includedQuestionIds.add(link.questionId)
        results.push({
          _id: link._id,
          _creationTime: link._creationTime,
          selectionPeriodId: args.selectionPeriodId,
          questionId: link.questionId,
          order: link.order,
          sourceTemplateId: link.sourceTemplateId,
          question
        })
      }
    }

    // 2. Get derived questions from categories (for backwards compatibility)
    const period = await ctx.db.get(args.selectionPeriodId)
    if (!period) return results

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

    // If categories are linked, add derived questions
    if (categoryIds.size > 0) {
      // Get category names from those IDs
      const categoryNames = new Set<string>()
      for (const categoryId of categoryIds) {
        const category = await ctx.db.get(categoryId)
        if (category) {
          categoryNames.add(category.name)
        }
      }

      if (categoryNames.size > 0) {
        // Get questions matching those category names (same semester)
        const allQuestions = await ctx.db
          .query("questions")
          .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
          .collect()

        const derivedQuestions = allQuestions.filter(q =>
          categoryNames.has(q.category) && !includedQuestionIds.has(q._id)
        )

        // Sort by category name for consistent ordering, then by createdAt
        derivedQuestions.sort((a, b) => {
          const catCompare = a.category.localeCompare(b.category)
          if (catCompare !== 0) return catCompare
          return a.createdAt - b.createdAt
        })

        // Add derived questions after explicit ones
        const startOrder = results.length > 0 ? Math.max(...results.map(r => r.order)) + 1 : 0
        for (let i = 0; i < derivedQuestions.length; i++) {
          const question = derivedQuestions[i]
          results.push({
            _id: `derived-${question._id}` as Id<"selectionQuestions">,
            _creationTime: question.createdAt,
            selectionPeriodId: args.selectionPeriodId,
            questionId: question._id,
            order: startOrder + i,
            sourceTemplateId: undefined,
            question
          })
        }
      }
    }

    return results
  }
})

export const applyTemplate = mutation({
  args: { selectionPeriodId: v.id("selectionPeriods"), templateId: v.id("questionTemplates") },
  handler: async (ctx, args) => {
    const tqs = await ctx.db.query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.templateId))
      .collect()
    const existing = await ctx.db.query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()
    const maxOrder = existing.reduce((max, sq) => Math.max(max, sq.order), 0)

    for (let i = 0; i < tqs.length; i++) {
      await ctx.db.insert("selectionQuestions", SelectionQuestion.make({
        selectionPeriodId: args.selectionPeriodId,
        questionId: tqs[i].questionId,
        order: maxOrder + i + 1,
        sourceTemplateId: args.templateId
      }))
    }
  }
})

export const addQuestion = mutation({
  args: { selectionPeriodId: v.id("selectionPeriods"), questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    const maxOrder = existing.reduce((max, sq) => Math.max(max, sq.order), 0)

    await ctx.db.insert("selectionQuestions", SelectionQuestion.make({
      selectionPeriodId: args.selectionPeriodId,
      questionId: args.questionId,
      order: maxOrder + 1,
      sourceTemplateId: undefined
    }))
  }
})

export const removeQuestion = mutation({
  args: { selectionPeriodId: v.id("selectionPeriods"), questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const selectionQuestion = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .filter(q => q.eq(q.field("questionId"), args.questionId))
      .first()

    if (selectionQuestion) {
      await ctx.db.delete(selectionQuestion._id)
    }
  }
})

export const reorder = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    questionIds: v.array(v.id("questions"))
  },
  handler: async (ctx, args) => {
    const selectionQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // Update order for each question based on position in questionIds array
    for (let i = 0; i < args.questionIds.length; i++) {
      const sq = selectionQuestions.find(sq => sq.questionId === args.questionIds[i])
      if (sq) {
        await ctx.db.patch(sq._id, { order: i + 1 })
      }
    }
  }
})
