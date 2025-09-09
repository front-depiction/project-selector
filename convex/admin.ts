import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"

/**
 * Seeds test data for development.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const semesterId = "2024-spring"

    // Create selection period (open for 30 days from now)
    const now = Date.now()
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

    const period = SelectionPeriod.make({
      semesterId,
      openDate: now,
      closeDate: thirtyDaysFromNow,
      isActive: true,
      title: "Test Period",
      description: "This is an auto generate test period"
    })

    await ctx.db.insert("selectionPeriods", period)

    // Create sample topics
    const topicData = [
      {
        title: "Machine Learning Recommendation System",
        description: "Build a recommendation system using collaborative filtering and deep learning techniques"
      },
      {
        title: "Blockchain Smart Contracts",
        description: "Develop and deploy smart contracts on Ethereum for decentralized applications"
      },
      {
        title: "Mobile AR Gaming Application",
        description: "Create an augmented reality mobile game using Unity and ARCore/ARKit"
      },
      {
        title: "Cloud-Native Microservices",
        description: "Design and implement a microservices architecture using Kubernetes and service mesh"
      },
      {
        title: "Natural Language Processing Chatbot",
        description: "Build an intelligent chatbot using transformer models and conversational AI"
      },
      {
        title: "Computer Vision for Medical Imaging",
        description: "Apply deep learning to medical image analysis for disease detection"
      },
      {
        title: "IoT Smart Home System",
        description: "Develop an integrated IoT system for home automation and monitoring"
      },
      {
        title: "Quantum Computing Algorithms",
        description: "Implement quantum algorithms and explore quantum supremacy applications"
      },
      {
        title: "Cybersecurity Threat Detection",
        description: "Build an AI-powered system for detecting and preventing cyber threats"
      },
      {
        title: "Data Visualization Dashboard",
        description: "Create interactive data visualization tools for business intelligence"
      }
    ]

    await Promise.all(
      topicData.map(data => {
        const topic = Topic.make({
          ...data,
          semesterId,
          isActive: true
        })
        return ctx.db.insert("topics", topic)
      })
    )

    return { success: true, message: "Test data created successfully" }
  }
})

/**
 * Creates a new topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createTopic = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    semesterId: v.string()
  },
  handler: async (ctx, args) => {
    const topic = Topic.make({
      title: args.title,
      description: args.description,
      semesterId: args.semesterId,
      isActive: true
    })

    const id = await ctx.db.insert("topics", topic)
    return { success: true, id }
  }
})

/**
 * Updates an existing topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const updateTopic = mutation({
  args: {
    id: v.id("topics"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Topic not found")
    }

    const updates: any = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.isActive !== undefined) updates.isActive = args.isActive

    await ctx.db.patch(args.id, updates)
    return { success: true }
  }
})

/**
 * Deletes a topic.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const deleteTopic = mutation({
  args: {
    id: v.id("topics")
  },
  handler: async (ctx, args) => {
    // Check if topic has any preferences
    const allPreferences = await ctx.db.query("preferences").collect()
    const hasSelections = allPreferences.some(pref =>
      pref.topicOrder.includes(args.id)
    )

    if (hasSelections) {
      throw new Error("Cannot delete topic with existing student selections")
    }

    await ctx.db.delete(args.id)
    return { success: true }
  }
})

/**
 * Creates or updates the selection period.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const upsertSelectionPeriod = mutation({
  args: {
    semesterId: v.string(),
    title: v.string(),
    description: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    // Deactivate all other periods if this one is active
    if (args.isActive) {
      const allPeriods = await ctx.db.query("selectionPeriods").collect()
      await Promise.all(
        allPeriods.map(period =>
          ctx.db.patch(period._id, { isActive: false })
        )
      )
    }

    // Check if period exists for this semester
    const existing = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_semester", q => q.eq("semesterId", args.semesterId))
      .first()

    const period = SelectionPeriod.make({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate,
      isActive: args.isActive
    })

    if (existing) {
      await ctx.db.patch(existing._id, period)
    } else {
      await ctx.db.insert("selectionPeriods", period)
    }

    return { success: true }
  }
})

/**
 * Gets the current selection period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getCurrentPeriod = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("selectionPeriods")
      .withIndex("by_active", q => q.eq("isActive", true))
      .first()
  }
})

/**
 * Gets all selection periods.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllPeriods = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("selectionPeriods").collect()
  }
})

/**
 * Clears all data (for development).
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear all tables
    const topics = await ctx.db.query("topics").collect()
    await Promise.all(
      topics.map(topic => ctx.db.delete(topic._id))
    )

    const preferences = await ctx.db.query("preferences").collect()
    await Promise.all(
      preferences.map(pref => ctx.db.delete(pref._id))
    )

    const periods = await ctx.db.query("selectionPeriods").collect()
    await Promise.all(
      periods.map(period => ctx.db.delete(period._id))
    )

    return { success: true, message: "All data cleared" }
  }
})
