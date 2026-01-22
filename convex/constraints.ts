import { v } from "convex/values"
import { query, mutation, internalQuery } from "./_generated/server"
import * as Constraint from "./schemas/Constraint"

/**
 * Get all constraints
 */
export const getAllConstraints = query({
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
 * Create a new constraint
 */
export const createConstraint = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    semesterId: v.string(),
    criterionType: v.optional(v.union(
      v.literal("prerequisite"),
      v.literal("minimize"),
      v.literal("pull"),
      v.literal("maximize"),
      v.literal("push")
    )),
    minRatio: v.optional(v.number()),
    minStudents: v.optional(v.number()),
    maxStudents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if constraint with same name already exists for this semester
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first()

    if (existing) {
      throw new Error(`Constraint "${args.name}" already exists for this semester`)
    }

    // Convert percentage to ratio (0.0-1.0) for minRatio (legacy support)
    const minRatio = args.minRatio !== undefined ? args.minRatio / 100 : undefined

    return await ctx.db.insert("categories", Constraint.make({
      ...args,
      minRatio,
      minStudents: args.minStudents,
      maxStudents: args.maxStudents,
    }))
  },
})

/**
 * Update a constraint
 */
export const updateConstraint = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    criterionType: v.optional(v.union(
      v.literal("prerequisite"),
      v.literal("minimize"),
      v.literal("pull"),
      v.literal("maximize"),
      v.literal("push")
    )),
    minRatio: v.optional(v.number()),
    minStudents: v.optional(v.number()),
    maxStudents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // If updating name, check for duplicates
    if (updates.name) {
      const constraint = await ctx.db.get(id)
      if (!constraint) throw new Error("Constraint not found")

      const allConstraints = await ctx.db
        .query("categories")
        .withIndex("by_semester", (q) => q.eq("semesterId", constraint.semesterId))
        .collect()

      const existing = allConstraints.find(
        (c) => c._id !== id && c.name.toLowerCase() === updates.name!.toLowerCase()
      )

      if (existing) {
        throw new Error(`Constraint "${updates.name}" already exists for this semester`)
      }
    }

    // Convert percentage to ratio (0.0-1.0) for minRatio (legacy support)
    const patchData: any = { ...updates }
    if (updates.minRatio !== undefined) {
      patchData.minRatio = updates.minRatio / 100
    }
    // If criterionType is being cleared, set to undefined
    if (updates.criterionType === null || updates.criterionType === undefined) {
      patchData.criterionType = undefined
      // Also clear related fields if criterion type is removed
      if (updates.criterionType === null) {
        patchData.minRatio = undefined
        patchData.minStudents = undefined
        patchData.maxStudents = undefined
      }
    }

    return await ctx.db.patch(id, patchData)
  },
})

/**
 * Delete a constraint
 */
export const deleteConstraint = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const constraint = await ctx.db.get(args.id)
    if (!constraint) throw new Error("Constraint not found")

    // Check if any questions are using this constraint
    const allQuestions = await ctx.db.query("questions").collect()
    const questionsUsingConstraint = allQuestions.filter((q) => q.category === constraint.name)

    // Unassign the questions
    if (questionsUsingConstraint.length > 0) {
      await Promise.all(
        questionsUsingConstraint.map((q) =>
          ctx.db.patch(q._id, { category: undefined })
        )
      )
    }

    return await ctx.db.delete(args.id)
  },
})

/**
 * Get constraint names only (for dropdowns)
 */
export const getConstraintNames = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const constraints = args.semesterId
      ? await ctx.db
        .query("categories")
        .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId!))
        .collect()
      : await ctx.db.query("categories").collect()

    return constraints.map((c) => c.name).sort()
  },
})

/**
 * Internal query to get all constraints for a semester (for CP-SAT solver)
 */
export const getAllConstraintsForSolver = internalQuery({
  args: { semesterId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .collect()
  },
})
