import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as SelectionQuestion from "./schemas/SelectionQuestion"

export const getQuestionsForPeriod = query({
  args: { selectionPeriodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const selectionQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.selectionPeriodId))
      .collect()

    // Sort by order
    selectionQuestions.sort((a, b) => a.order - b.order)

    // Deduplicate questions to prevent incorrect counts
    const uniqueQuestions: typeof selectionQuestions = []
    const seenIds = new Set<string>()

    for (const sq of selectionQuestions) {
      if (!seenIds.has(sq.questionId)) {
        seenIds.add(sq.questionId)
        uniqueQuestions.push(sq)
      }
    }

    // Fetch full question data for each unique question
    const questionsWithData = await Promise.all(
      uniqueQuestions.map(async (sq) => {
        const question = await ctx.db.get(sq.questionId)
        return {
          ...sq,
          question
        }
      })
    )

    return questionsWithData
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
