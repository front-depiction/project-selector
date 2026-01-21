import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as SelectionQuestion from "./schemas/SelectionQuestion"
import type { Id } from "./_generated/dataModel"

/**
 * Gets questions for a selection period by deriving them from linked categories.
 * 
 * Questions are included if their category is linked to:
 * 1. The period via `minimizeCategoryIds` (Balance Distribution - minimize criterion)
 * 2. Any topic in the period's semester via `constraintIds` (Topic-Specific - prerequisite/pull criteria)
 */
export const getQuestionsForPeriod = query({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    // 1. Get the period
    const period = await ctx.db.get(args.selectionPeriodId)
    if (!period) return []

    // 2. Get all topics for this semester
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .collect()

    // 3. Collect all category IDs from period and topics
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

    // 4. Get category names from those IDs
    const categoryNames = new Set<string>()
    for (const categoryId of categoryIds) {
      const category = await ctx.db.get(categoryId)
      if (category) {
        categoryNames.add(category.name)
      }
    }

    // If no valid category names found, return empty array
    if (categoryNames.size === 0) return []

    // 5. Get questions matching those category names (same semester)
    const allQuestions = await ctx.db
      .query("questions")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .collect()

    const matchingQuestions = allQuestions.filter(q => categoryNames.has(q.category))

    // Sort by category name for consistent ordering, then by createdAt
    matchingQuestions.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category)
      if (catCompare !== 0) return catCompare
      return a.createdAt - b.createdAt
    })

    // Return in expected format (matching the structure from selectionQuestions table)
    return matchingQuestions.map((question, index) => ({
      _id: `derived-${question._id}` as Id<"selectionQuestions">,
      _creationTime: question.createdAt,
      selectionPeriodId: args.selectionPeriodId,
      questionId: question._id,
      order: index,
      sourceTemplateId: undefined,
      question
    }))
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
