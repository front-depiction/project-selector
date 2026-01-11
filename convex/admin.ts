import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import { getActiveSelectionPeriod } from "./share/selection_periods"
import {
  createTestSelectionPeriod,
  createTestTopics,
  generateTestStudents,
  insertTestPreferences,
  createTestRankings,
  deleteAllFromTable,
  cancelAllScheduled
} from "./share/admin_helpers"

/**
 * Seeds test data for development.
 * Creates topics, categories, questions, students and preferences.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const semesterId = "2024-spring"
    const now = Date.now()
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

    // Create selection period and topics
    const [periodId, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, semesterId, now, thirtyDaysFromNow),
      createTestTopics(ctx, semesterId)
    ])

    // Create 5 categories
    const categoryNames = [
      { name: "Technical Skills", description: "Programming and technical abilities" },
      { name: "Soft Skills", description: "Communication and teamwork abilities" },
      { name: "Academic Background", description: "Prior coursework and knowledge" },
      { name: "Interests", description: "Personal interests and motivation" },
      { name: "Availability", description: "Time commitment and schedule flexibility" },
    ]
    
    const categoryIds = await Promise.all(
      categoryNames.map(cat => 
        ctx.db.insert("categories", {
          name: cat.name,
          description: cat.description,
          semesterId,
          createdAt: now,
        })
      )
    )

    // Create 10 questions across categories
    const questionsData = [
      // Technical Skills (2 questions)
      { question: "How comfortable are you with programming?", kind: "0to6" as const, category: categoryNames[0].name },
      { question: "Do you have experience with machine learning?", kind: "boolean" as const, category: categoryNames[0].name },
      // Soft Skills (2 questions)
      { question: "How do you rate your teamwork abilities?", kind: "0to6" as const, category: categoryNames[1].name },
      { question: "Are you comfortable presenting to groups?", kind: "boolean" as const, category: categoryNames[1].name },
      // Academic Background (2 questions)
      { question: "How familiar are you with the course prerequisites?", kind: "0to6" as const, category: categoryNames[2].name },
      { question: "Have you completed a similar project before?", kind: "boolean" as const, category: categoryNames[2].name },
      // Interests (2 questions)
      { question: "How interested are you in this topic area?", kind: "0to6" as const, category: categoryNames[3].name },
      { question: "Would you consider this topic for future career paths?", kind: "boolean" as const, category: categoryNames[3].name },
      // Availability (2 questions)
      { question: "How many hours per week can you dedicate to this project?", kind: "0to6" as const, category: categoryNames[4].name },
      { question: "Can you attend weekly team meetings?", kind: "boolean" as const, category: categoryNames[4].name },
    ]

    const questionIds = await Promise.all(
      questionsData.map(q =>
        ctx.db.insert("questions", {
          question: q.question,
          kind: q.kind,
          category: q.category,
          semesterId,
          createdAt: now,
        })
      )
    )

    // Link first 7 questions to the selection period
    await Promise.all(
      questionIds.slice(0, 7).map((questionId, index) =>
        ctx.db.insert("selectionQuestions", {
          selectionPeriodId: periodId,
          questionId,
          order: index,
        })
      )
    )

    // Generate 20 student access codes for the period
    const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const generateAccessCode = () => {
      let code = ""
      for (let i = 0; i < 6; i++) {
        code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
      }
      return code
    }

    const accessCodes: string[] = []
    const existingCodes = new Set<string>()
    for (let i = 0; i < 20; i++) {
      let code: string
      do {
        code = generateAccessCode()
      } while (existingCodes.has(code))
      existingCodes.add(code)
      accessCodes.push(code)

      await ctx.db.insert("periodStudentAllowList", {
        selectionPeriodId: periodId,
        studentId: code,
        addedAt: now,
        addedBy: "system",
      })
    }

    // Create students and preferences
    const students = generateTestStudents(topicIds, 60)
    const [preferenceIds] = await Promise.all([
      insertTestPreferences(ctx, students, semesterId),
      createTestRankings(ctx, students, semesterId)
    ])
    
    return { 
      preferenceIds, 
      categoryCount: categoryIds.length, 
      questionCount: questionIds.length,
      accessCodeCount: accessCodes.length,
      sampleAccessCodes: accessCodes.slice(0, 5) // Return first 5 codes for testing
    }
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
    semesterId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("topics", Topic.make({
      title: args.title,
      description: args.description,
      semesterId: args.semesterId,
      isActive: true,
    }))
    return id
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
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.get(args.id).then(maybeTopic =>
      maybeTopic
      || Promise.reject("Topic Not Found"))

    const updates: any = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.isActive !== undefined) updates.isActive = args.isActive

    await ctx.db.patch(args.id, updates)
  }
})

/**
 * Toggles a topic's active status.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const toggleTopicActive = mutation({
  args: {
    id: v.id("topics")
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.id)
    if (!topic) {
      throw new Error("Topic not found")
    }

    await ctx.db.patch(args.id, {
      isActive: !topic.isActive
    })
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
  }
})


/**
 * Creates a selection period for seeding/testing.
 * Pure creation function - no cleanup or deletion.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const createSelectionPeriod = mutation({
  args: {
    semesterId: v.string(),
    title: v.string(),
    description: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    const period = SelectionPeriod.makeInactive({
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate
    })

    const periodId = await ctx.db.insert("selectionPeriods", period)

    // If active, schedule close and activate
    if (args.isActive) {
      const scheduledId = await ctx.scheduler.runAt(
        args.closeDate,
        internal.assignments.assignPeriod,
        { periodId }
      )
      await ctx.db.replace(periodId, SelectionPeriod.toOpen(period, scheduledId))
    }
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
    const active = await getActiveSelectionPeriod(ctx)
    if (active) return active

    const periods = await ctx.db.query("selectionPeriods").collect()
    return SelectionPeriod.getMostRecentAssigned(periods) ?? null
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
 * Deletes everything from all tables for a complete reset.
 *
 * @category Mutations
 * @since 0.1.0
 */
export const clearAllData = mutation({
  args: {},
  handler: (ctx) =>
    Promise.all([
      // Core data
      deleteAllFromTable(ctx, "topics"),
      deleteAllFromTable(ctx, "preferences"),
      deleteAllFromTable(ctx, "rankingEvents"),
      deleteAllFromTable(ctx, "selectionPeriods"),
      deleteAllFromTable(ctx, "assignments"),
      // Access lists
      deleteAllFromTable(ctx, "topicTeacherAllowList"),
      deleteAllFromTable(ctx, "periodStudentAllowList"),
      // Questions & answers
      deleteAllFromTable(ctx, "questions"),
      deleteAllFromTable(ctx, "questionTemplates"),
      deleteAllFromTable(ctx, "templateQuestions"),
      deleteAllFromTable(ctx, "selectionQuestions"),
      deleteAllFromTable(ctx, "studentAnswers"),
      deleteAllFromTable(ctx, "categories"),
      // Users (auth)
      deleteAllFromTable(ctx, "users"),
      // Scheduled functions
      cancelAllScheduled(ctx),
    ])
      .then(() => "All data cleared")
})
