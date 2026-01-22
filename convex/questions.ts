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
    kind: v.union(v.literal("boolean"), v.literal("0to6")),
    characteristicName: v.string(),
    semesterId: v.string()
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("questions", Question.make({
      question: args.question,
      kind: args.kind,
      characteristicName: args.characteristicName,
      semesterId: args.semesterId
    }))
  }
})

export const updateQuestion = mutation({
  args: {
    id: v.id("questions"),
    question: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("boolean"), v.literal("0to6"))),
    characteristicName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { id, characteristicName, ...updates } = args
    // Map characteristicName to the DB field name 'category'
    const dbUpdates = characteristicName !== undefined
      ? { ...updates, category: characteristicName }
      : updates
    return ctx.db.patch(id, dbUpdates)
  }
})

/**
 * Get all unique characteristic names (stored as 'category' in DB)
 */
export const getCharacteristicNames = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const questions = args.semesterId
      ? await ctx.db.query("questions").withIndex("by_semester", q => q.eq("semesterId", args.semesterId!)).collect()
      : await ctx.db.query("questions").collect()

    const characteristicNames = new Set<string>()
    for (const q of questions) {
      if (q.category) characteristicNames.add(q.category)
    }
    return Array.from(characteristicNames).sort()
  }
})

/**
 * @deprecated Use getCharacteristicNames instead
 */
export const getCategories = getCharacteristicNames

export const deleteQuestion = mutation({
  args: { id: v.id("questions") },
  handler: async (ctx, args) => {
    return ctx.db.delete(args.id)
  }
})
