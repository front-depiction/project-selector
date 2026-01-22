import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as Question from "./schemas/Question"

export const getAllQuestions = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const userId = identity.subject

    // Use the by_user index to filter by authenticated user
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect()

    // If semesterId is provided, filter further
    if (args.semesterId !== undefined) {
      return questions.filter(q => q.semesterId === args.semesterId)
    }

    return questions
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    return ctx.db.insert("questions", Question.make({
      userId,
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    // Verify ownership
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error("Question not found")
    if (existing.userId !== userId) throw new Error("Not authorized to update this question")

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const userId = identity.subject

    // Use the by_user index to filter by authenticated user
    const allQuestions = await ctx.db
      .query("questions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect()

    // If semesterId is provided, filter further
    const questions = args.semesterId
      ? allQuestions.filter(q => q.semesterId === args.semesterId)
      : allQuestions

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    // Verify ownership
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error("Question not found")
    if (existing.userId !== userId) throw new Error("Not authorized to delete this question")

    return ctx.db.delete(args.id)
  }
})
