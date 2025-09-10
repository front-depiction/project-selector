import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import * as Subtopic from "./schemas/Subtopic"

/**
 * Get subtopics by IDs.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getSubtopicsByIds = query({
  args: {
    ids: v.array(v.id("subtopics"))
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.ids.map(id => ctx.db.get(id))
    )
  }
})

/**
 * Get all subtopics.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllSubtopics = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("subtopics").collect()
  }
})

/**
 * Create a new subtopic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createSubtopic = mutation({
  args: {
    title: v.string(),
    description: v.string()
  },
  handler: async (ctx, args) => {
    const subtopic = Subtopic.make({
      title: args.title,
      description: args.description
    })

    const id = await ctx.db.insert("subtopics", subtopic)
    return { success: true, id }
  }
})

/**
 * Create multiple subtopics at once.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createMultipleSubtopics = mutation({
  args: {
    subtopics: v.array(v.object({
      title: v.string(),
      description: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const ids = await Promise.all(
      args.subtopics.map(async (subtopicData) => {
        const subtopic = Subtopic.make(subtopicData)
        return await ctx.db.insert("subtopics", subtopic)
      })
    )
    return { success: true, ids }
  }
})

/**
 * Update a subtopic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const updateSubtopic = mutation({
  args: {
    id: v.id("subtopics"),
    title: v.optional(v.string()),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Subtopic not found")
    }

    const updates: any = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description

    await ctx.db.patch(args.id, updates)
    return { success: true }
  }
})

/**
 * Delete a subtopic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deleteSubtopic = mutation({
  args: {
    id: v.id("subtopics")
  },
  handler: async (ctx, args) => {
    // Remove subtopic ID from any topics that reference it
    const topics = await ctx.db.query("topics").collect()
    
    await Promise.all(
      topics
        .filter(topic => topic.subtopicIds?.includes(args.id))
        .map(topic => {
          const updatedSubtopicIds = topic.subtopicIds?.filter(id => id !== args.id) || []
          return ctx.db.patch(topic._id, { subtopicIds: updatedSubtopicIds })
        })
    )

    await ctx.db.delete(args.id)
    return { success: true }
  }
})

