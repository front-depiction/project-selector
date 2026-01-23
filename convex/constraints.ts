import { v } from "convex/values"
import { query, mutation, internalQuery } from "./_generated/server"
import * as Constraint from "./schemas/Constraint"

/**
 * Get all constraints
 * Filters by authenticated user's ID, or shows all if no userId filter needed.
 * Also includes constraints without userId (legacy data) that belong to current user's semesters.
 */
export const getAllConstraints = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const userId = identity.subject

    // Query by semester first (more efficient), then filter by user
    let constraints
    if (args.semesterId !== undefined && args.semesterId !== null) {
      constraints = await ctx.db
        .query("categories")
        .withIndex("by_semester", q => q.eq("semesterId", args.semesterId!))
        .collect()
      // Include constraints with matching userId OR without userId (legacy data that we'll claim)
      constraints = constraints.filter(c => !c.userId || c.userId === userId)
    } else {
      // Get constraints by user index (most common case)
      constraints = await ctx.db
        .query("categories")
        .withIndex("by_user", q => q.eq("userId", userId))
        .collect()
      
      // Also include constraints without userId in "default" semester (common case)
      // This catches orphaned constraints that should belong to the user
      const defaultSemesterConstraints = await ctx.db
        .query("categories")
        .withIndex("by_semester", q => q.eq("semesterId", "default"))
        .collect()
      const orphaned = defaultSemesterConstraints.filter(c => !c.userId)
      constraints = [...constraints, ...orphaned]
    }

    return constraints
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    // Check if constraint with same name already exists for this semester and user
    // Trim whitespace and do case-insensitive comparison
    const trimmedName = args.name.trim()
    const allConstraints = await ctx.db
      .query("categories")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .collect()

    // Check for duplicates - look for any constraint with same name in this semester
    // regardless of userId (to catch legacy data or cross-user issues)
    const existing = allConstraints.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )

    if (existing) {
      // If existing constraint doesn't have userId or has different userId, update it
      if (!existing.userId || existing.userId !== userId) {
        await ctx.db.patch(existing._id, { userId })
      }
      
      // Also ensure semesterId matches (in case of mismatch)
      if (existing.semesterId !== args.semesterId) {
        await ctx.db.patch(existing._id, { semesterId: args.semesterId })
      }
      
      // Throw error - constraint already exists (now it should be visible in UI after refresh)
      throw new Error(
        `Constraint "${existing.name}" already exists for this semester. ` +
        `It has been updated and should now be visible in the UI. Please refresh the page and delete it first, or use a different name.`
      )
    }

    // Convert percentage to ratio (0.0-1.0) for minRatio (legacy support)
    const minRatio = args.minRatio !== undefined ? args.minRatio / 100 : undefined

    return await ctx.db.insert("categories", Constraint.make({
      userId,
      ...args,
      name: trimmedName, // Use trimmed name
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const { id, ...updates } = args

    // Verify ownership
    const constraint = await ctx.db.get(id)
    if (!constraint) throw new Error("Constraint not found")
    if (constraint.userId !== userId) throw new Error("Not authorized to update this constraint")

    // If updating name, check for duplicates (trimmed and case-insensitive)
    if (updates.name) {
      const trimmedName = updates.name.trim()
      const allConstraints = await ctx.db
        .query("categories")
        .withIndex("by_semester", (q) => q.eq("semesterId", constraint.semesterId))
        .collect()

      const existing = allConstraints.find(
        (c) => c._id !== id && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )

      if (existing) {
        throw new Error(`Constraint "${existing.name}" already exists for this semester`)
      }
      
      // Update the name to trimmed version
      updates.name = trimmedName
    }

    // Convert percentage to ratio (0.0-1.0) for minRatio (legacy support)
    const patchData: Partial<{
      name: string
      description: string | undefined
      criterionType: "prerequisite" | "minimize" | "pull" | "maximize" | "push" | undefined
      minRatio: number | undefined
      minStudents: number | undefined
      maxStudents: number | undefined
    }> = { ...updates }
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const constraint = await ctx.db.get(args.id)
    if (!constraint) throw new Error("Constraint not found")

    // Verify ownership
    if (constraint.userId !== userId) throw new Error("Not authorized to delete this constraint")

    // Check if any questions are using this constraint
    const allQuestions = await ctx.db.query("questions").collect()
    const questionsUsingConstraint = allQuestions.filter((q) => q.category === constraint.name)

    // Delete questions that were using this category
    // (Questions require a category, so we delete them instead of leaving them orphaned)
    if (questionsUsingConstraint.length > 0) {
      await Promise.all(
        questionsUsingConstraint.map((q) => ctx.db.delete(q._id))
      )
    }

    return await ctx.db.delete(args.id)
  },
})

/**
 * Get constraint names only (for dropdowns)
 * Filters by authenticated user's ID.
 */
export const getConstraintNames = query({
  args: { semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const userId = identity.subject

    // Use the by_user index to filter by authenticated user
    const constraints = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    // If semesterId is provided, filter further
    const filteredConstraints = args.semesterId
      ? constraints.filter(c => c.semesterId === args.semesterId)
      : constraints

    return filteredConstraints.map((c) => c.name).sort()
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

/**
 * Debug query: Find constraint by name (regardless of userId/semesterId)
 * Helps identify why constraints aren't showing in UI
 */
export const findConstraintByName = query({
  args: { name: v.string(), semesterId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const userId = identity.subject
    const trimmedName = args.name.trim().toLowerCase()

    // Search in the specified semester, or all semesters if not specified
    let allConstraints
    if (args.semesterId !== undefined && args.semesterId !== null) {
      allConstraints = await ctx.db
        .query("categories")
        .withIndex("by_semester", q => q.eq("semesterId", args.semesterId!))
        .collect()
    } else {
      // Get all constraints for current user
      allConstraints = await ctx.db
        .query("categories")
        .withIndex("by_user", q => q.eq("userId", userId))
        .collect()
    }

    const found = allConstraints.find(
      c => c.name.trim().toLowerCase() === trimmedName
    )

    if (!found) return null

    return {
      _id: found._id,
      name: found.name,
      semesterId: found.semesterId,
      userId: found.userId,
      criterionType: found.criterionType,
      description: found.description,
      matchesCurrentUser: found.userId === userId,
      matchesSemester: args.semesterId ? found.semesterId === args.semesterId : true,
    }
  },
})
