import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as TemplateQuestion from "./schemas/TemplateQuestion"

export const getQuestionsForTemplate = query({
  args: { templateId: v.id("questionTemplates") },
  handler: async (ctx, args) => {
    const templateQuestions = await ctx.db
      .query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.templateId))
      .collect()

    return templateQuestions.sort((a, b) => a.order - b.order)
  }
})

export const addQuestion = mutation({
  args: { templateId: v.id("questionTemplates"), questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.templateId))
      .collect()
    const maxOrder = existing.reduce((max, tq) => Math.max(max, tq.order), 0)
    return ctx.db.insert("templateQuestions", TemplateQuestion.make({
      templateId: args.templateId,
      questionId: args.questionId,
      order: maxOrder + 1
    }))
  }
})

export const removeQuestion = mutation({
  args: { templateId: v.id("questionTemplates"), questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const templateQuestion = await ctx.db
      .query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.templateId))
      .filter(q => q.eq(q.field("questionId"), args.questionId))
      .first()

    if (templateQuestion) {
      await ctx.db.delete(templateQuestion._id)
    }
  }
})

export const reorder = mutation({
  args: {
    templateId: v.id("questionTemplates"),
    questionIds: v.array(v.id("questions"))
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.templateId))
      .collect()

    // Delete all existing template questions
    for (const tq of existing) {
      await ctx.db.delete(tq._id)
    }

    // Reinsert with new order based on array position
    for (let i = 0; i < args.questionIds.length; i++) {
      await ctx.db.insert("templateQuestions", TemplateQuestion.make({
        templateId: args.templateId,
        questionId: args.questionIds[i],
        order: i + 1
      }))
    }
  }
})
