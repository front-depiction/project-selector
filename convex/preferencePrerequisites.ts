import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import * as PreferencePrerequisite from "./schemas/PreferencePrerequisite"
import type { Id } from "./_generated/dataModel"

/**
 * Batch creates multiple preference-prerequisite relationships.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const setMultiplePreferencePrerequisites = mutation({
  args: {
    relationships: v.array(v.object({
      preferenceId: v.id("preferences"),
      prerequisiteId: v.id("prerequisites"),
      isMet: v.boolean()
    }))
  },
  handler: async (ctx, args) => {
    const results: Id<"preferencePrerequisites">[] = []
    
    for (const relationship of args.relationships) {
      // Check if relationship already exists
      const existing = await ctx.db
        .query("preferencePrerequisites")
        .withIndex("by_preference", q => 
          q.eq("preferenceId", relationship.preferenceId)
        )
        .filter(q => q.eq(q.field("prerequisiteId"), relationship.prerequisiteId))
        .first()
      
      if (existing) {
        // Update existing relationship
        await ctx.db.patch(existing._id, { isMet: relationship.isMet })
        results.push(existing._id)
      } else {
        // Create new relationship
        const newRelationship = PreferencePrerequisite.make({
          preferenceId: relationship.preferenceId,
          prerequisiteId: relationship.prerequisiteId,
          isMet: relationship.isMet
        })
        const id = await ctx.db.insert("preferencePrerequisites", newRelationship)
        results.push(id)
      }
    }
    
    return results
  }
})

/**
 * Deletes all preference-prerequisite relationships for a specific preference.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deleteAllPreferencePrerequisites = mutation({
  args: {
    preferenceId: v.id("preferences")
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_preference", q => q.eq("preferenceId", args.preferenceId))
      .collect()

    const deletedIds: Id<"preferencePrerequisites">[] = []
    
    for (const relationship of relationships) {
      await ctx.db.delete(relationship._id)
      deletedIds.push(relationship._id)
    }
    
    return deletedIds
  }
})

/**
 * Deletes all preference-prerequisite relationships for a specific prerequisite.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deleteAllPrerequisitePreferences = mutation({
  args: {
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_prerequisite", q => q.eq("prerequisiteId", args.prerequisiteId))
      .collect()

    const deletedIds: Id<"preferencePrerequisites">[] = []
    
    for (const relationship of relationships) {
      await ctx.db.delete(relationship._id)
      deletedIds.push(relationship._id)
    }
    
    return deletedIds
  }
})

/**
 * Gets preference-prerequisite relationships with full details.
 * Includes both preference and prerequisite information.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPreferencePrerequisitesWithDetails = query({
  args: {
    preferenceId: v.id("preferences")
  },
  handler: async (ctx, args) => {
    const results = []
    const query = ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_preference", q => q.eq("preferenceId", args.preferenceId))
    
    // Stream with concurrent fetches
    for await (const relationship of query) {
      const [prerequisite, preference] = await Promise.all([
        ctx.db.get(relationship.prerequisiteId),
        ctx.db.get(relationship.preferenceId),
      ])
      
      if (prerequisite && preference) {
        results.push({ relationship, prerequisite, preference })
      }
    }
    
    return results
  }
})

/**
 * Gets prerequisite-preference relationships with full details.
 * Includes both preference and prerequisite information.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPrerequisitePreferencesWithDetails = query({
  args: {
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const results = []
    const query = ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_prerequisite", q => q.eq("prerequisiteId", args.prerequisiteId))
    
    // Stream with concurrent fetches
    for await (const relationship of query) {
      const [prerequisite, preference] = await Promise.all([
        ctx.db.get(relationship.prerequisiteId),
        ctx.db.get(relationship.preferenceId),
      ])
      
      if (prerequisite && preference) {
        results.push({ relationship, prerequisite, preference })
      }
    }
    
    return results
  }
})