import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as Category from "./schemas/Category"

/**
 * Get all categories
 */
export const getAllCategories = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.semesterId !== undefined) {
      return await ctx.db
        .query("categories")
        .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId!))
        .collect()
    }
    return await ctx.db.query("categories").collect()
  },
})

/**
 * Create a new category
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    semesterId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if category with same name already exists for this semester
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first()

    if (existing) {
      throw new Error(`Category "${args.name}" already exists for this semester`)
    }

    return await ctx.db.insert("categories", Category.make(args))
  },
})

/**
 * Update a category
 */
export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // If updating name, check for duplicates
    if (updates.name) {
      const category = await ctx.db.get(id)
      if (!category) throw new Error("Category not found")

      const allCategories = await ctx.db
        .query("categories")
        .withIndex("by_semester", (q) => q.eq("semesterId", category.semesterId))
        .collect()

      const existing = allCategories.find(
        (c) => c._id !== id && c.name.toLowerCase() === updates.name!.toLowerCase()
      )

      if (existing) {
        throw new Error(`Category "${updates.name}" already exists for this semester`)
      }
    }

    return await ctx.db.patch(id, updates)
  },
})

/**
 * Delete a category
 */
export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id)
    if (!category) throw new Error("Category not found")

    // Check if any questions are using this category
    const questionsUsingCategory = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", category.name))
      .collect()

    // Unassign the questions
    if (questionsUsingCategory.length > 0) {
      await Promise.all(
        questionsUsingCategory.map((q) =>
          ctx.db.patch(q._id, { category: undefined })
        )
      )
    }

    return await ctx.db.delete(args.id)
  },
})

/**
 * Get category names only (for dropdowns)
 */
export const getCategoryNames = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const categories = args.semesterId
      ? await ctx.db
        .query("categories")
        .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId!))
        .collect()
      : await ctx.db.query("categories").collect()

    return categories.map((c) => c.name).sort()
  },
})
