import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import * as Prerequisite from "./schemas/Prerequisite"
import * as PreferencePrerequisite from "./schemas/PreferencePrerequisite"
import type { Id, Doc } from "./_generated/dataModel"

/**
 * Gets all prerequisites.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllPrerequisites = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("prerequisites").collect()
  }
})

/**
 * Gets a single prerequisite by ID.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPrerequisite = query({
  args: {
    id: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Creates a new prerequisite.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createPrerequisite = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    requiredValue: v.number()
  },
  handler: async (ctx, args) => {
    const prerequisite = Prerequisite.make({
      title: args.title,
      description: args.description,
      requiredValue: args.requiredValue
    })
    return await ctx.db.insert("prerequisites", prerequisite)
  }
})

/**
 * Updates an existing prerequisite.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const updatePrerequisite = mutation({
  args: {
    id: v.id("prerequisites"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    requiredValue: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Prerequisite not found")
    }

    const updates: any = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.requiredValue !== undefined) updates.requiredValue = args.requiredValue

    await ctx.db.patch(args.id, updates)
    return args.id
  }
})

/**
 * Gets prerequisites for a specific topic.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getTopicPrerequisites = query({
  args: {
    topicId: v.id("topics")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId)
    if (!topic || !topic.prerequisiteIds) return []
    
    return await Promise.all(
      topic.prerequisiteIds.map(id => ctx.db.get(id as Id<"prerequisites">))
    )
  }
})

/**
 * Gets preference-prerequisite relationships for a preference.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPreferencePrerequisites = query({
  args: {
    preferenceId: v.id("preferences")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_preference", q => q.eq("preferenceId", args.preferenceId))
      .collect()
  }
})

/**
 * Sets a preference-prerequisite relationship.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const setPreferencePrerequisite = mutation({
  args: {
    preferenceId: v.id("preferences"),
    prerequisiteId: v.id("prerequisites"),
    isMet: v.boolean()
  },
  handler: async (ctx, args) => {
    // Check if relationship already exists
    const existing = await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_preference", q => q.eq("preferenceId", args.preferenceId))
      .filter(q => q.eq(q.field("prerequisiteId"), args.prerequisiteId))
      .first()

    if (existing) {
      // Update existing relationship
      await ctx.db.patch(existing._id, { isMet: args.isMet })
    } else {
      // Create new relationship
      await ctx.db.insert("preferencePrerequisites", PreferencePrerequisite.make({
        preferenceId: args.preferenceId,
        prerequisiteId: args.prerequisiteId,
        isMet: args.isMet
      }))
    }
  }
})

/**
 * Deletes a preference-prerequisite relationship.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deletePreferencePrerequisite = mutation({
  args: {
    preferenceId: v.id("preferences"),
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_preference", q => 
        q.eq("preferenceId", args.preferenceId)
      )
      .filter(q => q.eq(q.field("prerequisiteId"), args.prerequisiteId))
      .first()

    if (!relationship) {
      throw new Error("Preference-prerequisite relationship not found")
    }

    await ctx.db.delete(relationship._id)
    return relationship._id
  }
})

/**
 * Gets all preference-prerequisite relationships.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllPreferencePrerequisites = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("preferencePrerequisites").collect()
  }
})

/**
 * Gets all preference-prerequisite relationships for a specific prerequisite.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPrerequisitePreferences = query({
  args: {
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_prerequisite", q => q.eq("prerequisiteId", args.prerequisiteId))
      .collect()
  }
})

/**
 * Checks if all prerequisites for a topic are met for a given preference.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const checkTopicPrerequisitesMet = query({
  args: {
    preferenceId: v.id("preferences"),
    topicId: v.id("topics")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId)
    if (!topic || !topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
      return true // No prerequisites means they're considered met
    }
    
    // Get all preference-prerequisite relationships for this preference
    const preferencePrereqs = await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_preference", q => q.eq("preferenceId", args.preferenceId))
      .collect()
    
    // Check if all topic prerequisites are met
    for (const prereqId of topic.prerequisiteIds) {
      const relationship = preferencePrereqs.find(
        pref => pref.prerequisiteId === prereqId
      )
      
      if (!relationship || !relationship.isMet) {
        return false
      }
    }
    
    return true
  }
})

/**
 * Deletes a prerequisite.
 * Also removes it from any topics that have it assigned.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deletePrerequisite = mutation({
  args: {
    id: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const prerequisite = await ctx.db.get(args.id)
    if (!prerequisite) {
      throw new Error("Prerequisite not found")
    }

    // Find all topics that have this prerequisite
    const allTopics = await ctx.db.query("topics").collect()
    const topicsWithPrereq = allTopics.filter(topic => 
      topic.prerequisiteIds?.includes(args.id)
    )

    // Remove prerequisite from all topics
    for (const topic of topicsWithPrereq) {
      if (topic.prerequisiteIds) {
        const updatedPrerequisiteIds = topic.prerequisiteIds.filter(id => id !== args.id)
        await ctx.db.patch(topic._id, {
          prerequisiteIds: updatedPrerequisiteIds.length ? updatedPrerequisiteIds : undefined
        })
      }
    }

    // Delete all preference-prerequisite relationships for this prerequisite
    const relationships = await ctx.db
      .query("preferencePrerequisites")
      .withIndex("by_prerequisite", q => q.eq("prerequisiteId", args.id))
      .collect()

    for (const relationship of relationships) {
      await ctx.db.delete(relationship._id)
    }

    // Delete all student prerequisite evaluations for this prerequisite
    const studentEvaluations = await ctx.db
      .query("studentPrerequisites")
      .withIndex("by_prerequisite", q => q.eq("prerequisiteId", args.id))
      .collect()

    for (const evaluation of studentEvaluations) {
      await ctx.db.delete(evaluation._id)
    }

    // Delete prerequisite itself
    await ctx.db.delete(args.id)
    return args.id
  }
})

// NEW FUNCTIONS FOR TOPIC ASSIGNMENT

/**
 * Gets all topics with their prerequisite data.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getTopicsWithPrerequisites = query({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db.query("topics").collect()

    // Process topics in parallel to get their prerequisites
    const topicsWithPrereqs = await Promise.all(
      topics.map(async (topic) => {
        const topicPrerequisites = topic.prerequisiteIds
          ? await Promise.all(
              topic.prerequisiteIds.map(id => ctx.db.get(id as Id<"prerequisites">))
            )
          : []

        return {
          ...topic,
          prerequisites: topicPrerequisites.filter(Boolean) as Doc<"prerequisites">[]
        }
      })
    )

    return topicsWithPrereqs
  }
})

/**
 * Assigns a prerequisite to a topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const assignPrerequisiteToTopic = mutation({
  args: {
    topicId: v.id("topics"),
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId)
    if (!topic) {
      throw new Error("Topic not found")
    }

    const prerequisite = await ctx.db.get(args.prerequisiteId)
    if (!prerequisite) {
      throw new Error("Prerequisite not found")
    }

    // Add prerequisite to topic if not already assigned
    const currentPrereqIds = topic.prerequisiteIds || []
    if (!currentPrereqIds.includes(args.prerequisiteId)) {
      await ctx.db.patch(args.topicId, {
        prerequisiteIds: [...currentPrereqIds, args.prerequisiteId]
      })
    }
  }
})

/**
 * Removes a prerequisite from a topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const removePrerequisiteFromTopic = mutation({
  args: {
    topicId: v.id("topics"),
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId)
    if (!topic) {
      throw new Error("Topic not found")
    }

    if (!topic.prerequisiteIds) {
      return // No prerequisites to remove
    }

    // Remove prerequisite from topic
    const updatedPrereqIds = topic.prerequisiteIds.filter(id => id !== args.prerequisiteId)
    await ctx.db.patch(args.topicId, {
      prerequisiteIds: updatedPrereqIds.length ? updatedPrereqIds : undefined
    })
  }
})