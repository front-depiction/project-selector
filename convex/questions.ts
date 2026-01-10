import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as Question from "./schemas/Question"

export const getAllQuestions = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.semesterId !== undefined) {
      return ctx.db.query("questions").withIndex("by_semester", q => q.eq("semesterId", args.semesterId!)).collect()
    }
    return ctx.db.query("questions").collect()
  }
})

export const createQuestion = mutation({
  args: {
    question: v.string(),
    kind: v.union(v.literal("boolean"), v.literal("0to10")),
    category: v.optional(v.string()),
    semesterId: v.string()
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("questions", Question.make(args))
  }
})

export const updateQuestion = mutation({
  args: {
    id: v.id("questions"),
    question: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("boolean"), v.literal("0to10"))),
    category: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    return ctx.db.patch(id, updates)
  }
})

/**
 * Get all unique categories
 */
export const getCategories = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const questions = args.semesterId
      ? await ctx.db.query("questions").withIndex("by_semester", q => q.eq("semesterId", args.semesterId!)).collect()
      : await ctx.db.query("questions").collect()
    
    const categories = new Set<string>()
    for (const q of questions) {
      if (q.category) categories.add(q.category)
    }
    return Array.from(categories).sort()
  }
})

export const deleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    return ctx.db.delete(args.id)
  }
})
