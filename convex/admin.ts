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
import { createRankingEventsAndUpdateAggregate } from "./share/rankings"
import { generateShareableSlug } from "./lib/slugGenerator"

/**
 * Seed generator: 70 students, 10 groups, leadership category with 4 questions,
 * printer access question, calculus prerequisite on 2 topics, python skills pull on 2 groups,
 * all topics can be ranked with different titles/descriptions
 */
async function seedLeadershipPython(ctx: any, userId: string) {
  const semesterId = "2024-spring"
  const now = Date.now()
  const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

  // Create selection period
  const periodId = await createTestSelectionPeriod(ctx, userId, semesterId, now, thirtyDaysFromNow, {
    rankingsEnabled: true,
  })

  // Create 10 topics with different titles and descriptions
  const topicData = [
    { title: "Advanced Machine Learning", description: "Deep dive into neural networks and deep learning architectures" },
    { title: "Blockchain Development", description: "Build decentralized applications using smart contracts" },
    { title: "Cybersecurity Analysis", description: "Analyze and defend against modern cyber threats" },
    { title: "Data Science Pipeline", description: "End-to-end data science project from collection to deployment" },
    { title: "Cloud Infrastructure", description: "Design and deploy scalable cloud-based systems" },
    { title: "Mobile App Development", description: "Create cross-platform mobile applications" },
    { title: "Web Development Stack", description: "Full-stack web development with modern frameworks" },
    { title: "IoT Systems Design", description: "Build Internet of Things solutions for real-world problems" },
    { title: "Game Development", description: "Create interactive games using modern game engines" },
    { title: "DevOps Automation", description: "Automate deployment and infrastructure management" },
  ]

  const topicIds = await Promise.all(
    topicData.map(data =>
      ctx.db.insert("topics", Topic.make({
        userId,
        title: data.title,
        description: data.description,
        semesterId,
        isActive: true,
      }))
    )
  )

  // Create categories with different criterion types
  // 1. Leadership (minimize) - 4 questions
  const leadershipCategoryId = await ctx.db.insert("categories", {
    userId,
    name: "Leadership",
    description: "Leadership and team management abilities (minimize - balance evenly)",
    semesterId,
    createdAt: now,
    criterionType: "minimize" as const,
    minRatio: undefined,
  })

  // 2. Printer Access (minimize)
  const printerCategoryId = await ctx.db.insert("categories", {
    userId,
    name: "Printer Access",
    description: "Access to printing resources (minimize - balance evenly)",
    semesterId,
    createdAt: now,
    criterionType: "minimize" as const,
    minRatio: undefined,
  })

  // 3. Calculus (prerequisite) - for 2 topics
  const calculusCategoryId = await ctx.db.insert("categories", {
    userId,
    name: "Calculus Prerequisite",
    description: "Calculus background requirement (prerequisite - applies to topics 0 and 1)",
    semesterId,
    createdAt: now,
    criterionType: "prerequisite" as const,
    minRatio: 0.7, // At least 70% must have passed
  })

  // 4. Python Skills (pull) - for 2 groups
  const pythonCategoryId = await ctx.db.insert("categories", {
    userId,
    name: "Python Skills",
    description: "Python programming abilities (pull - maximize, applies to topics 2 and 3)",
    semesterId,
    createdAt: now,
    criterionType: "pull" as const,
    minRatio: undefined,
  })

  // Create 4 questions about leadership (0-6 scale)
  const leadershipQuestions = [
    "How comfortable are you taking the lead in group projects?",
    "How well do you handle team conflicts and disagreements?",
    "How confident are you in delegating tasks to team members?",
    "How experienced are you in managing project timelines?",
  ]

  const leadershipQuestionIds = await Promise.all(
    leadershipQuestions.map(q =>
      ctx.db.insert("questions", {
        userId,
        question: q,
        kind: "0to6" as const,
        category: "Leadership",
        semesterId,
        createdAt: now,
      })
    )
  )

  // Create 1 question: "do you have access to a printer?" (minimize)
  const printerQuestionId = await ctx.db.insert("questions", {
    userId,
    question: "Do you have access to a printer?",
    kind: "boolean" as const,
    category: "Printer Access",
    semesterId,
    createdAt: now,
  })

  // Create prerequisite question: "did you pass calculus?"
  const calculusQuestionId = await ctx.db.insert("questions", {
    userId,
    question: "Did you pass calculus?",
    kind: "boolean" as const,
    category: "Calculus Prerequisite",
    semesterId,
    createdAt: now,
  })

  // Create pull question: "How would you rate your python skills"
  const pythonQuestionId = await ctx.db.insert("questions", {
    userId,
    question: "How would you rate your python skills?",
    kind: "0to6" as const,
    category: "Python Skills",
    semesterId,
    createdAt: now,
  })

  // Link all questions to the period
  const allQuestionIds = [...leadershipQuestionIds, printerQuestionId, calculusQuestionId, pythonQuestionId]
  await Promise.all(
    allQuestionIds.map((questionId, index) =>
      ctx.db.insert("selectionQuestions", {
        selectionPeriodId: periodId,
        questionId,
        order: index,
      })
    )
  )

  // Generate 70 access codes
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
  for (let i = 0; i < 70; i++) {
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

  // Create student answers with realistic distributions
  for (const studentId of accessCodes) {
    // Leadership questions (0-6, slightly correlated)
    const leadershipBase = Math.random() * 0.7 + 0.2 // 0.2 to 0.9
    for (const questionId of leadershipQuestionIds) {
      const value = Math.floor(Math.min(6, Math.max(0, (leadershipBase + (Math.random() - 0.5) * 0.3) * 6)))
      await ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
        studentId,
        selectionPeriodId: periodId,
        questionId,
        value,
      }))
    }

    // Printer access (70% have access)
    const hasPrinter = Math.random() < 0.7
    await ctx.db.insert("studentAnswers", StudentAnswer.makeBoolean({
      studentId,
      selectionPeriodId: periodId,
      questionId: printerQuestionId,
      value: hasPrinter,
    }))

    // Calculus (75% passed)
    const passedCalculus = Math.random() < 0.75
    await ctx.db.insert("studentAnswers", StudentAnswer.makeBoolean({
      studentId,
      selectionPeriodId: periodId,
      questionId: calculusQuestionId,
      value: passedCalculus,
    }))

    // Python skills (0-6)
    const pythonSkill = Math.floor(Math.random() * 7)
    await ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
      studentId,
      selectionPeriodId: periodId,
      questionId: pythonQuestionId,
      value: pythonSkill,
    }))
  }

  // Create preferences with rankings (all topics can be ranked)
  for (const studentId of accessCodes) {
    // Shuffle topics and create preference order
    const shuffledTopics = [...topicIds].sort(() => Math.random() - 0.5)
    const topicOrder = shuffledTopics.slice(0, 5) // Top 5 preferences
    const preference = Preference.make({
      studentId,
      semesterId,
      topicOrder,
    })
    await ctx.db.insert("preferences", preference)

    // Create ranking events (topics can be ranked)
    try {
      await createRankingEventsAndUpdateAggregate(ctx, {
        studentId,
        semesterId,
        topicOrder,
      })
    } catch (error) {
      console.warn("Failed to update rankings aggregate (likely due to missing component in test environment):", error)
    }
  }

  // Configure groups and constraints
  // 1. All groups: minimize leadership category and printer access
  await ctx.db.patch(periodId, {
    minimizeCategoryIds: [leadershipCategoryId, printerCategoryId]
  })

  // 2. Groups 0 and 1: prerequisite "did you pass calculus?"
  await Promise.all([
    ctx.db.patch(topicIds[0], { constraintIds: [calculusCategoryId] }),
    ctx.db.patch(topicIds[1], { constraintIds: [calculusCategoryId] }),
  ])

  // 3. Groups 2 and 3: pull "How would you rate your python skills"
  await Promise.all([
    ctx.db.patch(topicIds[2], { constraintIds: [pythonCategoryId] }),
    ctx.db.patch(topicIds[3], { constraintIds: [pythonCategoryId] }),
  ])

  return {
    periodId,
    topicCount: topicIds.length,
    categoryCount: 4, // Leadership, Printer Access, Calculus Prerequisite, Python Skills
    questionCount: allQuestionIds.length,
    studentCount: accessCodes.length,
    groupCount: 10,
    sampleAccessCodes: accessCodes.slice(0, 5),
  }
}

/**
 * Seed generator: 60 students, 5 groups, minimize 1 category with 2 IT skills questions,
 * no additional questions, topics can't be ranked
 */
async function seedITSkills(ctx: any, userId: string) {
  const semesterId = "2024-spring"
  const now = Date.now()
  const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)

  // Create selection period
  const periodId = await createTestSelectionPeriod(ctx, userId, semesterId, now, thirtyDaysFromNow, {
    rankingsEnabled: false,
  })

  // Create 5 topics with different titles and descriptions
  const topicData = [
    { title: "Software Engineering Fundamentals", description: "Core principles of software design and development" },
    { title: "Database Systems", description: "Design and implement efficient database solutions" },
    { title: "Network Security", description: "Secure network infrastructure and protocols" },
    { title: "System Administration", description: "Manage and maintain IT infrastructure" },
    { title: "IT Project Management", description: "Lead and coordinate IT projects effectively" },
  ]

  const topicIds = await Promise.all(
    topicData.map(data =>
      ctx.db.insert("topics", Topic.make({
        userId,
        title: data.title,
        description: data.description,
        semesterId,
        isActive: true,
      }))
    )
  )

  // Create 1 category: IT Skills (minimize)
  const itCategoryId = await ctx.db.insert("categories", {
    userId,
    name: "IT Skills",
    description: "Technical and digital competencies",
    semesterId,
    createdAt: now,
    criterionType: "minimize" as const,
    minRatio: undefined,
  })

  // Create 2 questions about IT skills (0-6 scale)
  const itQuestions = [
    "How comfortable are you with troubleshooting technical issues?",
    "How confident are you in learning new software and tools?",
  ]

  const itQuestionIds = await Promise.all(
    itQuestions.map(q =>
      ctx.db.insert("questions", {
        userId,
        question: q,
        kind: "0to6" as const,
        category: "IT Skills",
        semesterId,
        createdAt: now,
      })
    )
  )

  // Link questions to the period
  await Promise.all(
    itQuestionIds.map((questionId, index) =>
      ctx.db.insert("selectionQuestions", {
        selectionPeriodId: periodId,
        questionId,
        order: index,
      })
    )
  )

  // Generate 60 access codes
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
  for (let i = 0; i < 60; i++) {
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

  // Create student answers
  for (const studentId of accessCodes) {
    const itBase = Math.random() * 0.7 + 0.2 // 0.2 to 0.9
    for (const questionId of itQuestionIds) {
      const value = Math.floor(Math.min(6, Math.max(0, (itBase + (Math.random() - 0.5) * 0.3) * 6)))
      await ctx.db.insert("studentAnswers", StudentAnswer.makeZeroToSix({
        studentId,
        selectionPeriodId: periodId,
        questionId,
        value,
      }))
    }
  }

  // Create preferences WITHOUT rankings (topics can't be ranked)
  // Just create preferences but no ranking events
  for (const studentId of accessCodes) {
    const shuffledTopics = [...topicIds].sort(() => Math.random() - 0.5)
    const preference = Preference.make({
      studentId,
      semesterId,
      topicOrder: shuffledTopics.slice(0, 3), // Top 3 preferences
    })
    await ctx.db.insert("preferences", preference)
    // Note: NOT calling createRankingEventsAndUpdateAggregate - topics can't be ranked
  }

  // Link category to selection period (minimize IT skills)
  await ctx.db.patch(periodId, {
    minimizeCategoryIds: [itCategoryId]
  })

  return {
    periodId,
    topicCount: topicIds.length,
    categoryCount: 1,
    questionCount: itQuestionIds.length,
    studentCount: accessCodes.length,
    groupCount: 5,
    sampleAccessCodes: accessCodes.slice(0, 5),
  }
}

/**
 * Seeds test data for development.
 * Creates topics, categories, questions, students and preferences.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const seedTestData = mutation({
  args: {
    seedType: v.optional(v.union(v.literal("default"), v.literal("leadership-python"), v.literal("it-skills")))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const seedType = args.seedType ?? "default"

    if (seedType === "leadership-python") {
      return await seedLeadershipPython(ctx, userId)
    } else if (seedType === "it-skills") {
      return await seedITSkills(ctx, userId)
    }

    // Default seed (existing implementation)
    const semesterId = "2024-spring"
    const now = Date.now()
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    // Create selection period and topics
    const [periodId, closedPeriodId, topicIds] = await Promise.all([
      createTestSelectionPeriod(ctx, userId, semesterId, now, thirtyDaysFromNow, {
        rankingsEnabled: true,
      }),
      // Create a closed period for testing
      ctx.db.insert("selectionPeriods", SelectionPeriod.makeClosed({
        userId,
        semesterId,
        title: "Closed Test Period",
        description: "This is a closed period for testing closed session behavior",
        openDate: oneWeekAgo,
        closeDate: oneDayAgo,
        shareableSlug: generateShareableSlug(),
        rankingsEnabled: true,
      })),
      createTestTopics(ctx, userId, semesterId)
    ])

    // Create an open period with all questionnaires completed
    // Since it's already open (opened 3 days ago), create as inactive then convert to open
    const openWithQuestionnairesOpenDate = now - (3 * 24 * 60 * 60 * 1000) // Opened 3 days ago
    const openWithQuestionnairesSlug = generateShareableSlug()
    const inactivePeriod = SelectionPeriod.makeInactive({
      userId,
      semesterId,
      title: "Open Period - All Questionnaires Complete",
      description: "An open period where all students have completed their questionnaires",
      openDate: openWithQuestionnairesOpenDate,
      closeDate: thirtyDaysFromNow,
      shareableSlug: openWithQuestionnairesSlug,
      rankingsEnabled: true,
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

    // Create 5 categories with criterion types
    const categoryNames = [
      {
        name: "Technical Skills",
        description: "Programming and technical abilities",
        criterionType: "minimize" as const, // Balance evenly - no group gets all the best coders
      },
      {
        name: "Soft Skills",
        description: "Communication and teamwork abilities",
        criterionType: "pull" as const, // Maximize - put students with good teamwork together
      },
      {
        name: "Academic Background",
        description: "Prior coursework and knowledge",
        criterionType: "minimize" as const, // Balance evenly - mix of experience levels
      },
      {
        name: "Interests",
        description: "Personal interests and motivation",
        criterionType: "pull" as const, // Maximize - group students with similar interests
      },
      {
        name: "Availability",
        description: "Time commitment and schedule flexibility",
        criterionType: "prerequisite" as const, // Required minimum - ensure groups have enough available students
        minRatio: 0.3 // At least 30% of students in each group must have good availability
      },
    ]

    const categoryIds = await Promise.all(
      categoryNames.map(cat =>
        ctx.db.insert("categories", {
          userId,
          name: cat.name,
          description: cat.description,
          semesterId,
          createdAt: now,
          criterionType: cat.criterionType,
          minRatio: cat.minRatio,
        })
      )
    )

    // Link categories to selection period and topics
    const minimizeCategoryIds = categoryIds.filter((_, i) => categoryNames[i].criterionType === "minimize")
    const pullCategoryIds = categoryIds.filter((_, i) => categoryNames[i].criterionType === "pull")
    const prerequisiteCategoryIds = categoryIds.filter((_, i) => categoryNames[i].criterionType === "prerequisite")

    await Promise.all([
      // 1. Link minimize categories to the selection periods
      ctx.db.patch(periodId, { minimizeCategoryIds }),
      ctx.db.patch(closedPeriodId, { minimizeCategoryIds }),
      ctx.db.patch(openWithQuestionnairesPeriodId, { minimizeCategoryIds }),

      // 2. Link pull/prerequisite categories to some topics
      // Topic 0: first pull and first prerequisite
      ctx.db.patch(topicIds[0], { constraintIds: [pullCategoryIds[0], prerequisiteCategoryIds[0]] }),
      // Topic 1: second pull
      ctx.db.patch(topicIds[1], { constraintIds: [pullCategoryIds[1]] }),
    ])

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
          userId,
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

    // Create assignments for the closed period
    // Note: Mutations cannot call actions, so seed data uses simple distribution for speed.
    // However, all categories are correctly configured with criterion types (see categoryNames above),
    // so when teachers use "Assign Now (CP-SAT)" in the UI, it will use the CP-SAT algorithm
    // with all the criterion types (Required Minimum, Balance Evenly, Maximize) properly applied.
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
        userId,
        semesterId: closedPeriod.semesterId,
        title: closedPeriod.title,
        description: closedPeriod.description,
        openDate: closedPeriod.openDate,
        closeDate: closedPeriod.closeDate,
        shareableSlug: closedPeriod.shareableSlug,
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
    constraintIds: v.optional(v.array(v.id("categories"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const count = args.duplicateCount ?? 1
    const topicData = Topic.make({
      userId,
      title: args.title,
      description: args.description,
      semesterId: args.semesterId,
      isActive: true,
      constraintIds: args.constraintIds,
    })

    // Create multiple copies of the topic
    const ids = await Promise.all(
      Array.from({ length: count }, () => ctx.db.insert("topics", topicData))
    )

    // Mark onboarding step complete
    await ctx.runMutation(internal.teacherOnboarding.markStepCompleteInternal, {
      userId,
      stepId: "create_topics"
    })

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
    constraintIds: v.optional(v.array(v.id("categories"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const topic = await ctx.db.get(args.id)
    if (!topic) throw new Error("Topic not found")

    // Verify ownership
    if (topic.userId !== userId) {
      throw new Error("Not authorized to update this topic")
    }

    const updates: any = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.description !== undefined) updates.description = args.description
    if (args.isActive !== undefined) updates.isActive = args.isActive
    if (args.constraintIds !== undefined) updates.constraintIds = args.constraintIds

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const topic = await ctx.db.get(args.id)
    if (!topic) {
      throw new Error("Topic not found")
    }

    // Verify ownership
    if (topic.userId !== userId) {
      throw new Error("Not authorized to modify this topic")
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    const topic = await ctx.db.get(args.id)
    if (!topic) throw new Error("Topic not found")

    // Verify ownership
    if (topic.userId !== userId) {
      throw new Error("Not authorized to delete this topic")
    }

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
    isActive: v.boolean(),
    minimizeCategoryIds: v.optional(v.array(v.id("categories"))),
    rankingsEnabled: v.optional(v.boolean()),
    topicIds: v.optional(v.array(v.id("topics"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

    // Update selected topics' semesterId to link them to this period
    if (args.topicIds && args.topicIds.length > 0) {
      for (const topicId of args.topicIds) {
        const topic = await ctx.db.get(topicId)
        if (topic) {
          await ctx.db.patch(topicId, { semesterId: args.semesterId })
        }
      }
    }

    const shareableSlug = generateShareableSlug()
    const period = SelectionPeriod.makeInactive({
      userId,
      semesterId: args.semesterId,
      title: args.title,
      description: args.description,
      openDate: args.openDate,
      closeDate: args.closeDate,
      shareableSlug,
      minimizeCategoryIds: args.minimizeCategoryIds,
      rankingsEnabled: args.rankingsEnabled,
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
 * Filters by authenticated user's ID.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getCurrentPeriod = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const userId = identity.subject

    // Get active selection period owned by this user
    const active = await getActiveSelectionPeriod(ctx)
    if (active && active.userId === userId) return active

    // If no active period, get the most recent assigned period owned by this user
    const periods = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect()
    return SelectionPeriod.getMostRecentAssigned(periods) ?? null
  }
})

/**
 * Gets all selection periods.
 * Filters by authenticated user's ID.
 *
 * @category Queries
 * @since 0.1.0
 */
export const getAllPeriods = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const userId = identity.subject

    return await ctx.db
      .query("selectionPeriods")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect()
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const userId = identity.subject

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
          userId,
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
          userId,
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
          userId,
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

    const experimentSlug = generateShareableSlug()
    const period = SelectionPeriod.makeInactive({
      userId,
      semesterId,
      title: "Experiment: Team Assignment",
      description: periodDescription,
      openDate: now,
      closeDate: thirtyDaysFromNow,
      shareableSlug: experimentSlug,
      rankingsEnabled: true,
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
