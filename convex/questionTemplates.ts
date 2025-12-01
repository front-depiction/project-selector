import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as QuestionTemplate from "./schemas/QuestionTemplate"

/**
 * Gets all question templates, optionally filtered by semester.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getAllTemplates = query({
  args: {
    semesterId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const semesterId = args.semesterId

    if (semesterId) {
      return await ctx.db
        .query("questionTemplates")
        .withIndex("by_semester", q => q.eq("semesterId", semesterId))
        .collect()
    }

    return await ctx.db.query("questionTemplates").collect()
  }
})

/**
 * Creates a new question template.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const createTemplate = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    semesterId: v.string()
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert(
      "questionTemplates",
      QuestionTemplate.make({
        title: args.title,
        description: args.description,
        semesterId: args.semesterId
      })
    )

    return templateId
  }
})

/**
 * Updates an existing question template.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const updateTemplate = mutation({
  args: {
    id: v.id("questionTemplates"),
    title: v.optional(v.string()),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Template not found")
    }

    await ctx.db.patch(args.id, {
      title: args.title ?? existing.title,
      description: args.description ?? existing.description
    })

    return { success: true }
  }
})

/**
 * Deletes a question template and all its related template questions.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const deleteTemplate = mutation({
  args: {
    id: v.id("questionTemplates")
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id)
    if (!template) {
      throw new Error("Template not found")
    }

    // Delete all related template questions
    const templateQuestions = await ctx.db
      .query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.id))
      .collect()

    await Promise.all(
      templateQuestions.map(tq => ctx.db.delete(tq._id))
    )

    // Delete the template itself
    await ctx.db.delete(args.id)

    return { success: true }
  }
})

/**
 * Gets a template with all its questions joined.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getTemplateWithQuestions = query({
  args: { id: v.id("questionTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id)
    if (!template) return null

    const tqs = await ctx.db
      .query("templateQuestions")
      .withIndex("by_template", q => q.eq("templateId", args.id))
      .collect()

    const questions = await Promise.all(
      tqs.map(tq => ctx.db.get(tq.questionId))
    )

    return { ...template, questions: questions.filter(Boolean) }
  }
})

/**
 * Gets all templates with their question IDs for form selection.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getAllTemplatesWithQuestionIds = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("questionTemplates").collect()

    const templatesWithQuestionIds = await Promise.all(
      templates.map(async (template) => {
        const tqs = await ctx.db
          .query("templateQuestions")
          .withIndex("by_template", q => q.eq("templateId", template._id))
          .collect()

        return {
          _id: template._id,
          title: template.title,
          questionIds: tqs.map(tq => tq.questionId)
        }
      })
    )

    return templatesWithQuestionIds
  }
})
