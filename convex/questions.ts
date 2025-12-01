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
  args: { question: v.string(), kind: v.union(v.literal("boolean"), v.literal("0to10")), semesterId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.insert("questions", Question.make(args))
  }
})

export const updateQuestion = mutation({
  args: {
    id: v.id("questions"),
    question: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("boolean"), v.literal("0to10")))
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    return ctx.db.patch(id, updates)
  }
})

export const deleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    return ctx.db.delete(args.id)
  }
})
