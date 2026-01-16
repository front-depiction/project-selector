import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import * as Topic from "./schemas/Topic"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as Preference from "./schemas/Preference"
import * as StudentAnswer from "./schemas/StudentAnswer"
import * as Assignment from "./schemas/Assignment"
import { getActiveSelectionPeriod } from "./share/selection_periods"
import {
  createTestSelectionPeriod,
  createTestTopics,
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
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    // Create selection period and topics
    const [periodId, closedPeriodId, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, semesterId, now, thirtyDaysFromNow),
      // Create a closed period for testing
      ctx.db.insert("selectionPeriods", SelectionPeriod.makeClosed({
        semesterId,
        title: "Closed Test Period",
        description: "This is a closed period for testing closed session behavior",
        openDate: oneWeekAgo,
        closeDate: oneDayAgo
      })),
      createTestTopics(ctx, semesterId)
    ])

    // Create an open period with all questionnaires completed
    // Since it's already open (opened 3 days ago), create as inactive then convert to open
    const openWithQuestionnairesOpenDate = now - (3 * 24 * 60 * 60 * 1000) // Opened 3 days ago
    const inactivePeriod = SelectionPeriod.makeInactive({
      semesterId,
      title: "Open Period - All Questionnaires Complete",
      description: "An open period where all students have completed their questionnaires",
      openDate: openWithQuestionnairesOpenDate,
      closeDate: thirtyDaysFromNow,
    })
    const openWithQuestionnairesPeriodId = await ctx.db.insert("selectionPeriods", inactivePeriod)
    
    // Schedule the close function
    const scheduledCloseId = await ctx.scheduler.runAt(
      thirtyDaysFromNow,
      internal.assignments.assignPeriod,
      { periodId: openWithQuestionnairesPeriodId }
    )
    
    // Convert to open with the scheduled function
    const openPeriod = SelectionPeriod.toOpen(inactivePeriod, scheduledCloseId)
    await ctx.db.replace(openWithQuestionnairesPeriodId, openPeriod)

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

    // Link first 7 questions to all periods
    await Promise.all([
      // Questions for open period
      ...questionIds.slice(0, 7).map((questionId, index) =>
        ctx.db.insert("selectionQuestions", {
          selectionPeriodId: periodId,
          questionId,
          order: index,
        })
      ),
      // Questions for closed period
      ...questionIds.slice(0, 7).map((questionId, index) =>
        ctx.db.insert("selectionQuestions", {
          selectionPeriodId: closedPeriodId,
          questionId,
          order: index,
        })
      ),
      // Questions for open period with all questionnaires complete
      ...questionIds.slice(0, 7).map((questionId, index) =>
        ctx.db.insert("selectionQuestions", {
          selectionPeriodId: openWithQuestionnairesPeriodId,
          questionId,
          order: index,
        })
      )
    ])

    // Generate access codes helper
    const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const generateAccessCode = () => {
      let code = ""
      for (let i = 0; i < 6; i++) {
        code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
      }
      return code
    }

    // Generate 20 student access codes for the open period
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

    // Generate 15 student access codes for the closed period
    const closedAccessCodes: string[] = []
    for (let i = 0; i < 15; i++) {
      let code: string
      do {
        code = generateAccessCode()
      } while (existingCodes.has(code))
      existingCodes.add(code)
      closedAccessCodes.push(code)

      await ctx.db.insert("periodStudentAllowList", {
        selectionPeriodId: closedPeriodId,
        studentId: code,
        addedAt: oneWeekAgo, // Added when period was open
        addedBy: "system",
      })
    }

    // Generate 15 student access codes for the open period with all questionnaires complete
    const openWithQuestionnairesAccessCodes: string[] = []
    for (let i = 0; i < 15; i++) {
      let code: string
      do {
        code = generateAccessCode()
      } while (existingCodes.has(code))
      existingCodes.add(code)
      openWithQuestionnairesAccessCodes.push(code)

      await ctx.db.insert("periodStudentAllowList", {
        selectionPeriodId: openWithQuestionnairesPeriodId,
        studentId: code,
        addedAt: now - (3 * 24 * 60 * 60 * 1000), // Added when period opened
        addedBy: "system",
      })
    }

    // Create preferences for the open period (some students have already submitted)
    const openPreferences = await Promise.all(
      accessCodes.slice(0, 12).map((studentId) => {
        // Shuffle topics and take first 5
        const shuffledTopics = [...topicIds].sort(() => Math.random() - 0.5)
        const preference = Preference.make({
          studentId,
          semesterId,
          topicOrder: shuffledTopics.slice(0, 5),
        })
        return ctx.db.insert("preferences", preference)
      })
    )

    // Create preferences for ALL closed period students (all 15 students submitted)
    // Store preference data before inserting so we can use it for assignments
    const closedPreferenceData = closedAccessCodes.map((studentId) => {
      // Shuffle topics and take first 5
      const shuffledTopics = [...topicIds].sort(() => Math.random() - 0.5)
      return {
        studentId,
        topicOrder: shuffledTopics.slice(0, 5),
        lastUpdated: oneDayAgo - (24 * 60 * 60 * 1000), // Submitted 2 days ago
      }
    })

    const closedPreferences = await Promise.all(
      closedPreferenceData.map((prefData) => {
        const preference = Preference.make({
          studentId: prefData.studentId,
          semesterId,
          topicOrder: prefData.topicOrder,
        })
        // Override lastUpdated to simulate earlier submission
        return ctx.db.insert("preferences", {
          ...preference,
          lastUpdated: prefData.lastUpdated,
        })
      })
    )

    // Create student answers (questionnaire data) for both periods
    // Get the first 7 questions (which are linked to both periods)
    const periodQuestionIds = questionIds.slice(0, 7)
    
    // Create answers for open period students (8 students completed questionnaire)
    const openStudentAnswers = await Promise.all(
      accessCodes.slice(0, 8).flatMap((studentId) =>
        periodQuestionIds.map((questionId, index) => {
          const question = questionsData[index]
          if (question.kind === "boolean") {
            return ctx.db.insert("studentAnswers", StudentAnswer.makeBoolean({
              studentId,
              selectionPeriodId: periodId,
              questionId,
              value: Math.random() > 0.5, // Random true/false
            }))
          } else {
            return ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
              studentId,
              selectionPeriodId: periodId,
              questionId,
              value: Math.floor(Math.random() * 7), // Random 0-6
            }))
          }
        })
      )
    )

    // Create answers for ALL closed period students (all 15 students completed questionnaire)
    const closedStudentAnswers = await Promise.all(
      closedAccessCodes.flatMap((studentId) =>
        periodQuestionIds.map((questionId, index) => {
          const question = questionsData[index]
          if (question.kind === "boolean") {
            return ctx.db.insert("studentAnswers", StudentAnswer.makeBoolean({
              studentId,
              selectionPeriodId: closedPeriodId,
              questionId,
              value: Math.random() > 0.5, // Random true/false
            }))
          } else {
            return ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
              studentId,
              selectionPeriodId: closedPeriodId,
              questionId,
              value: Math.floor(Math.random() * 7), // Random 0-6
            }))
          }
        })
      )
    )

    // Create preferences for ALL open period with questionnaires students (all 15 students submitted)
    const openWithQuestionnairesPreferenceData = openWithQuestionnairesAccessCodes.map((studentId) => {
      // Shuffle topics and take first 5
      const shuffledTopics = [...topicIds].sort(() => Math.random() - 0.5)
      return {
        studentId,
        topicOrder: shuffledTopics.slice(0, 5),
      }
    })

    const openWithQuestionnairesPreferences = await Promise.all(
      openWithQuestionnairesPreferenceData.map((prefData) => {
        const preference = Preference.make({
          studentId: prefData.studentId,
          semesterId,
          topicOrder: prefData.topicOrder,
        })
        return ctx.db.insert("preferences", preference)
      })
    )

    // Create answers for ALL open period with questionnaires students (all 15 students completed questionnaire)
    const openWithQuestionnairesStudentAnswers = await Promise.all(
      openWithQuestionnairesAccessCodes.flatMap((studentId) =>
        periodQuestionIds.map((questionId, index) => {
          const question = questionsData[index]
          if (question.kind === "boolean") {
            return ctx.db.insert("studentAnswers", StudentAnswer.makeBoolean({
              studentId,
              selectionPeriodId: openWithQuestionnairesPeriodId,
              questionId,
              value: Math.random() > 0.5, // Random true/false
            }))
          } else {
            return ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
              studentId,
              selectionPeriodId: openWithQuestionnairesPeriodId,
              questionId,
              value: Math.floor(Math.random() * 7), // Random 0-6
            }))
          }
        })
      )
    )

    // Create assignments for the closed period (to show formed groups)
    // Convert closed period to assigned period with assignments
    const assignmentBatchId = Assignment.createBatchId(closedPeriodId)
    const closedPeriodAssignments = await Promise.all(
      closedPreferenceData.map((pref, index) => {
        // Assign students to topics based on their preferences (prioritize top choices)
        const preferredTopicId = pref.topicOrder[0] // First preference
        const assignedTopicId = preferredTopicId || topicIds[index % topicIds.length] // Fallback to round-robin
        const originalRank = pref.topicOrder.indexOf(assignedTopicId) + 1 // 1-based rank, or undefined if not in preferences
        
        return ctx.db.insert("assignments", Assignment.make({
          periodId: closedPeriodId,
          batchId: assignmentBatchId,
          studentId: pref.studentId,
          topicId: assignedTopicId,
          assignedAt: oneDayAgo - (24 * 60 * 60 * 1000), // Assigned 2 days ago
          originalRank: originalRank > 0 ? originalRank : undefined
        }))
      })
    )

    // Update closed period to assigned state
    const closedPeriod = await ctx.db.get(closedPeriodId)
    if (closedPeriod) {
      await ctx.db.replace(closedPeriodId, SelectionPeriod.makeAssigned({
        semesterId: closedPeriod.semesterId,
        title: closedPeriod.title,
        description: closedPeriod.description,
        openDate: closedPeriod.openDate,
        closeDate: closedPeriod.closeDate,
        assignmentBatchId
      }))
    }
    
    return { 
      categoryCount: categoryIds.length, 
      questionCount: questionIds.length,
      openPeriodAccessCodeCount: accessCodes.length,
      closedPeriodAccessCodeCount: closedAccessCodes.length,
      openWithQuestionnairesAccessCodeCount: openWithQuestionnairesAccessCodes.length,
      openPeriodPreferencesCount: openPreferences.length,
      closedPeriodPreferencesCount: closedPreferences.length,
      openWithQuestionnairesPreferencesCount: openWithQuestionnairesPreferences.length,
      openPeriodStudentAnswersCount: openStudentAnswers.length,
      closedPeriodStudentAnswersCount: closedStudentAnswers.length,
      openWithQuestionnairesStudentAnswersCount: openWithQuestionnairesStudentAnswers.length,
      closedPeriodAssignmentsCount: closedPeriodAssignments.length,
      sampleAccessCodes: accessCodes.slice(0, 5), // Return first 5 codes for open period
      sampleClosedAccessCodes: closedAccessCodes.slice(0, 5), // Return first 5 codes for closed period
      sampleOpenWithQuestionnairesAccessCodes: openWithQuestionnairesAccessCodes.slice(0, 5), // Return first 5 codes for open period with questionnaires
      openPeriodId: periodId,
      closedPeriodId: closedPeriodId,
      openWithQuestionnairesPeriodId: openWithQuestionnairesPeriodId
    }
  }
})

/**
 * Creates a new topic (or multiple copies if duplicateCount > 1).
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const createTopic = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    semesterId: v.string(),
    duplicateCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const count = args.duplicateCount ?? 1
    const topicData = Topic.make({
      title: args.title,
      description: args.description,
      semesterId: args.semesterId,
      isActive: true,
    })
    
    // Create multiple copies of the topic
    const ids = await Promise.all(
      Array.from({ length: count }, () => ctx.db.insert("topics", topicData))
    )
    
    // Return the first ID for backward compatibility
    return ids[0]
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

/**
 * Generates random answers for all students in the experiment period.
 * This is for testing purposes only.
 * 
 * @category Mutations
 * @since 0.4.0
 */
export const generateRandomAnswers = mutation({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    
    if (!period) {
      throw new Error("Period not found")
    }

    // Get all students for this period
    const accessList = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", args.periodId))
      .collect()

    // Get all questions for this period
    const selectionQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q) => q.eq("selectionPeriodId", args.periodId))
      .collect()

    const questionIds = selectionQuestions.map(sq => sq.questionId)

    let answersCreated = 0

    // Generate random answers for each student
    for (const accessCode of accessList) {
      for (const questionId of questionIds) {
        // Check if answer already exists
        const existingAnswer = await ctx.db
          .query("studentAnswers")
          .withIndex("by_student_period", (q) => 
            q.eq("studentId", accessCode.studentId)
             .eq("selectionPeriodId", args.periodId)
          )
          .filter((q) => q.eq(q.field("questionId"), questionId))
          .first()

        if (!existingAnswer) {
          // Generate random 0-6 answer
          const randomValue = Math.floor(Math.random() * 7)
          
          await ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
            studentId: accessCode.studentId,
            selectionPeriodId: args.periodId,
            questionId,
            value: randomValue,
          }))
          
          answersCreated++
        }
      }
    }

    return {
      studentsProcessed: accessList.length,
      questionsCount: questionIds.length,
      answersCreated,
    }
  }
})

/**
 * Sets up the experiment for user testing.
 * Creates categories, questions, topics, and access codes for the experiment.
 * 
 * @category Mutations
 * @since 0.4.0
 */
export const setupExperiment = mutation({
  args: {},
  handler: async (ctx) => {
    const semesterId = "experiment-2026"
    const now = Date.now()
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

    // Student names from prev_teams.txt (maintaining order for exclusion pairs)
    const studentNames = [
      // Team 1
      "Mats", "Tiberius", "Lard", "Vigo",
      // Team 2
      "Jasmijn", "Layan", "Kajsa", "Sara",
      // Team 3
      "Robin", "Esmee", "Alex", "Quirine",
      // Team 4
      "Hannah", "Sevval", "Stijn",
      // Team 5
      "Walid", "Finn", "Vic", "Jim",
      // Team 6
      "Finn", "Jolie", "Marcelina",
      // Team 7
      "Tess", "Sean", "Lotte",
      // Team 8
      "Melle", "Cas", "Tygo"
    ]

    // Build exclusion pairs (students who were in the same previous team)
    const teamSizes = [4, 4, 4, 3, 4, 3, 3, 3]
    const exclusions: Array<[number, number]> = []
    let startIdx = 0
    
    for (const teamSize of teamSizes) {
      // Generate all pairs within this team
      for (let i = startIdx; i < startIdx + teamSize; i++) {
        for (let j = i + 1; j < startIdx + teamSize; j++) {
          exclusions.push([i, j])
        }
      }
      startIdx += teamSize
    }

    // Create 4 categories
    const categories = [
      { name: "Leader", description: "Leadership and initiative qualities" },
      { name: "Creative Thinker", description: "Creative and analytical thinking abilities" },
      { name: "Doer", description: "Practical execution and implementation skills" },
      { name: "IT Professional", description: "Technical and digital competencies" },
    ]
    
    const categoryIds = await Promise.all(
      categories.map(cat => 
        ctx.db.insert("categories", {
          name: cat.name,
          description: cat.description,
          semesterId,
          createdAt: now,
        })
      )
    )

    // Create 16 questions (4 per category, all 0-6 scale)
    const questionsData = [
      // Leader (4 questions)
      { text: "I naturally take the initiative when the team needs to get started or gets stuck.", category: "Leader" },
      { text: "I can maintain a good overview and assign tasks within the team at the start of the lesson.", category: "Leader" },
      { text: "I listen carefully to others and take their ideas seriously.", category: "Leader" },
      { text: "I take responsibility for my own tasks and the group process.", category: "Leader" },
      // Creative Thinker (4 questions)
      { text: "I often come up with original ideas or unexpected solutions.", category: "Creative Thinker" },
      { text: "I enjoy improving or further developing existing ideas.", category: "Creative Thinker" },
      { text: "I enjoy analyzing problems and coming up with multiple possible solutions.", category: "Creative Thinker" },
      { text: "I reflect on what went well and what could be improved in my own work.", category: "Creative Thinker" },
      // Doer (4 questions)
      { text: "I enjoy working practically and would rather make something than just talk about it.", category: "Doer" },
      { text: "If something needs to be done, I tackle it quickly and independently.", category: "Doer" },
      { text: "I enjoy testing designs and using feedback to implement improvements.", category: "Doer" },
      { text: "I can work independently without constant guidance.", category: "Doer" },
      // IT Professional (4 questions)
      { text: "I'm comfortable working with digital tools (such as creating a shared folder in OneDrive, designing in Canva, or creating a presentation in Word).", category: "IT Professional" },
      { text: "I quickly learn new technical or digital skills.", category: "IT Professional" },
      { text: "I feel comfortable presenting technical ideas or results.", category: "IT Professional" },
      { text: "I'm comfortable giving and receiving feedback on technical or content-related choices.", category: "IT Professional" },
    ]

    const questionIds = await Promise.all(
      questionsData.map(q =>
        ctx.db.insert("questions", {
          question: q.text,
          kind: "0to6" as const,
          category: q.category,
          semesterId,
          createdAt: now,
        })
      )
    )

    // Create 7 group topics (identical placeholders)
    const topicIds = await Promise.all(
      Array.from({ length: 7 }, (_, i) => 
        ctx.db.insert("topics", Topic.make({
          title: `Group ${i + 1}`,
          description: "Experiment group - no specific project",
          semesterId,
          isActive: true,
        }))
      )
    )

    // Generate 28 unique access codes
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
    
    for (let i = 0; i < studentNames.length; i++) {
      let code: string
      do {
        code = generateAccessCode()
      } while (existingCodes.has(code))
      existingCodes.add(code)
      accessCodes.push(code)
    }

    // Create selection period with exclusion data embedded in description
    const exclusionsJson = JSON.stringify(exclusions)
    const periodDescription = `User test experiment - Team assignment based on student qualities. EXCLUSIONS:${exclusionsJson}`
    
    const period = SelectionPeriod.makeInactive({
      semesterId,
      title: "Experiment: Team Assignment",
      description: periodDescription,
      openDate: now,
      closeDate: thirtyDaysFromNow,
    })

    const periodId = await ctx.db.insert("selectionPeriods", period)

    // Schedule the close function
    const scheduledCloseId = await ctx.scheduler.runAt(
      thirtyDaysFromNow,
      internal.assignments.assignPeriod,
      { periodId }
    )
    
    // Convert to open with the scheduled function
    const openPeriod = SelectionPeriod.toOpen(period, scheduledCloseId)
    await ctx.db.replace(periodId, openPeriod)

    // Link all questions to the period
    await Promise.all(
      questionIds.map((questionId, index) =>
        ctx.db.insert("selectionQuestions", {
          selectionPeriodId: periodId,
          questionId,
          order: index,
        })
      )
    )

    // Create access codes for all students
    await Promise.all(
      accessCodes.map((code, index) =>
        ctx.db.insert("periodStudentAllowList", {
          selectionPeriodId: periodId,
          studentId: code,
          addedAt: now,
          addedBy: "experiment-setup",
        })
      )
    )

    // Build mapping for return
    const mapping = studentNames.map((name, index) => ({
      name,
      accessCode: accessCodes[index],
      originalTeam: index < 4 ? 1 : index < 8 ? 2 : index < 12 ? 3 : index < 15 ? 4 : index < 19 ? 5 : index < 22 ? 6 : index < 25 ? 7 : 8
    }))

    return {
      periodId,
      categoryCount: categoryIds.length,
      questionCount: questionIds.length,
      topicCount: topicIds.length,
      studentCount: accessCodes.length,
      exclusionPairCount: exclusions.length,
      mapping,
    }
  }
})
