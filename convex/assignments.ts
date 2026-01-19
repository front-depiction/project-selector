import { v } from "convex/values"
import { mutation, internalMutation, query, internalQuery, MutationCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import * as Assignment from "./schemas/Assignment"
import * as SelectionPeriod from "./schemas/SelectionPeriod"

/**
 * Assigns students to topics for a selection period.
 * 
 * @category Internal Mutations
 * @since 0.1.0
 */
export const assignPeriod = internalMutation({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    return await assignPeriodInternal(ctx, args.periodId)
  }
})

/**
 * Immediately assigns students to topics, canceling scheduled assignment.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const assignNow = mutation({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)

    if (!period) {
      throw new Error("Selection period not found")
    }

    if (SelectionPeriod.isAssigned(period)) {
      throw new Error("Period already assigned")
    }

    // Cancel scheduled function if exists
    if (SelectionPeriod.hasScheduledFunction(period)) {
      await ctx.scheduler.cancel(period.scheduledFunctionId)
    }

    // Run assignment immediately
    return await assignPeriodInternal(ctx, args.periodId)
  }
})

/**
 * Internal function to perform the actual assignment.
 * 
 * @category Internal Functions
 * @since 0.1.0
 */
async function assignPeriodInternal(
  ctx: MutationCtx,
  periodId: Id<"selectionPeriods">
): Promise<string | null> {
  const period = await ctx.db.get(periodId)

  if (!period) {
    throw new Error("Selection period not found")
  }

  if (SelectionPeriod.isAssigned(period)) {
    return period.assignmentBatchId // Already assigned
  }

  // Check if this is an experiment period (doesn't require topic preferences)
  const isExperiment = period.description.includes("EXCLUSIONS:")

  // Get all preferences for this semester
  const preferences = await ctx.db
    .query("preferences")
    .withIndex("by_semester", (q) => q.eq("semesterId", period.semesterId))
    .collect()

  // Get all active topics for this semester
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_semester", (q) => q.eq("semesterId", period.semesterId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect()

  // For experiment periods, get students from access list instead of preferences
  let studentIds: string[]
  if (isExperiment) {
    const accessList = await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", (q) => q.eq("selectionPeriodId", periodId))
      .collect()
    studentIds = accessList.map(a => a.studentId)
  } else {
    // Normal periods: get students from preferences
    studentIds = [...new Set(preferences.map((p) => p.studentId))]
  }

  // If no topics or students, close the period without assignment
  if (topics.length === 0 || studentIds.length === 0) {
    console.log(`[assignPeriod] Insufficient data for assignment (Topics: ${topics.length}, Students: ${studentIds.length}). Closing period without assignment.`)

    await ctx.db.replace(periodId, SelectionPeriod.makeClosed({
      semesterId: period.semesterId,
      title: period.title,
      description: period.description,
      openDate: period.openDate,
      closeDate: period.closeDate
    }))

    return null
  }

  // Transform preferences with topicOrder into flat ranked preferences
  const flatPreferences = preferences.flatMap((p) =>
    p.topicOrder.map((topicId, index) => ({
      studentId: p.studentId,
      topicId,
      rank: index + 1,
    }))
  )

  // Use simple distribution (CP-SAT is called via action wrapper)
  const assignments = distributeStudents(studentIds, topics, flatPreferences)

  // Create batch ID
  const batchId = Assignment.createBatchId(periodId)

  // Insert all assignments
  for (const assignment of assignments) {
    await ctx.db.insert("assignments", Assignment.make({
      periodId,
      batchId,
      studentId: assignment.studentId,
      topicId: assignment.topicId,
      assignedAt: Date.now(),
      originalRank: assignment.rank
    }))
  }

  // Update period status to assigned
  await ctx.db.replace(periodId, SelectionPeriod.assign(batchId)(
    SelectionPeriod.isClosed(period)
      ? period
      : SelectionPeriod.makeClosed({
        semesterId: period.semesterId,
        title: period.title,
        description: period.description,
        openDate: period.openDate,
        closeDate: period.closeDate
      })
  ))

  return batchId
}

/**
 * Distributes students evenly across topics.
 * 
 * @category Internal Functions
 * @since 0.1.0
 */
function distributeStudents(
  studentIds: string[],
  topics: Array<{ _id: Id<"topics"> }>,
  preferences: Array<{ studentId: string; topicId: Id<"topics">; rank: number }>
): Array<{ studentId: string; topicId: Id<"topics">; rank?: number }> {
  // Shuffle students for random distribution
  const shuffledStudents = [...studentIds].sort(() => Math.random() - 0.5)

  // Create preference lookup map
  const preferenceMap = new Map<string, Map<Id<"topics">, number>>()
  for (const pref of preferences) {
    if (!preferenceMap.has(pref.studentId)) {
      preferenceMap.set(pref.studentId, new Map())
    }
    preferenceMap.get(pref.studentId)!.set(pref.topicId, pref.rank)
  }

  // Distribute students evenly across topics
  const assignments: Array<{ studentId: string; topicId: Id<"topics">; rank?: number }> = []

  shuffledStudents.forEach((studentId, index) => {
    const topicIndex = index % topics.length
    const topicId = topics[topicIndex]._id

    // Find original rank if student had preference for this topic
    const studentPrefs = preferenceMap.get(studentId)
    const rank = studentPrefs?.get(topicId)

    assignments.push({
      studentId,
      topicId,
      rank
    })
  })

  return assignments
}

/**
 * Gets assignments for a selection period with quality averages.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAssignments = query({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)

    if (!period) {
      return null
    }

    // Check if there are any assignments for this period (regardless of status)
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_period", (q) => q.eq("periodId", args.periodId))
      .collect()

    // If no assignments exist, return null
    if (assignments.length === 0) {
      return null
    }

    // Group by topic with topic details
    const topics = await ctx.db.query("topics").collect()
    const topicMap = new Map(topics.map(t => [t._id, t]))

    // Get all student answers for this period
    const allAnswers = await ctx.db.query("studentAnswers").collect()
    const periodAnswers = allAnswers.filter(a => a.selectionPeriodId === args.periodId)

    // Get questions to map to categories
    const selectionQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q) => q.eq("selectionPeriodId", args.periodId))
      .collect()
    
    const questionIds = selectionQuestions.map(sq => sq.questionId)
    const questions = await Promise.all(
      questionIds.map(id => ctx.db.get(id))
    )
    const questionMap = new Map(questions.filter(q => q !== null).map(q => [q!._id, q!]))

    // Build student quality map (category -> average)
    const studentQualityMap = new Map<string, Map<string, number>>()
    
    for (const answer of periodAnswers) {
      const question = questionMap.get(answer.questionId)
      if (!question || !question.category) continue

      if (!studentQualityMap.has(answer.studentId)) {
        studentQualityMap.set(answer.studentId, new Map())
      }

      const qualities = studentQualityMap.get(answer.studentId)!
      const category = question.category
      
      if (!qualities.has(category)) {
        qualities.set(category, 0)
        qualities.set(`${category}_count`, 0)
      }

      const currentSum = qualities.get(category) || 0
      const currentCount = qualities.get(`${category}_count`) || 0
      
      qualities.set(category, currentSum + answer.normalizedAnswer * 6) // Convert back to 0-6
      qualities.set(`${category}_count`, currentCount + 1)
    }

    // Calculate averages
    for (const [studentId, qualities] of studentQualityMap.entries()) {
      const categories = Array.from(qualities.keys()).filter(k => !k.endsWith('_count'))
      for (const category of categories) {
        const sum = qualities.get(category) || 0
        const count = qualities.get(`${category}_count`) || 1
        qualities.set(category, sum / count)
        qualities.delete(`${category}_count`)
      }
    }

    const byTopic: Record<string, { 
      topic: typeof topics[0] | undefined; 
      students: Array<{ studentId: string; name?: string; originalRank?: number; assignedAt: number }>;
      qualityAverages: Record<string, number>;
    }> = {}

    for (const assignment of assignments) {
      const topicId = assignment.topicId as string
      const topic = topicMap.get(assignment.topicId)

      if (!byTopic[topicId]) {
        byTopic[topicId] = {
          topic: topic,
          students: [],
          qualityAverages: {}
        }
      }

      // Get student name if available
      const studentEntry = await ctx.db
        .query("periodStudentAllowList")
        .withIndex("by_studentId", (q) => q.eq("studentId", assignment.studentId))
        .first()

      byTopic[topicId].students.push({
        studentId: assignment.studentId,
        name: studentEntry?.name,
        originalRank: assignment.originalRank,
        assignedAt: assignment.assignedAt
      })
    }

    // Calculate quality averages for each topic
    for (const [topicId, data] of Object.entries(byTopic)) {
      const categoryTotals = new Map<string, { sum: number; count: number }>()

      for (const student of data.students) {
        const qualities = studentQualityMap.get(student.studentId)
        if (!qualities) continue

        for (const [category, value] of qualities.entries()) {
          if (!categoryTotals.has(category)) {
            categoryTotals.set(category, { sum: 0, count: 0 })
          }
          const totals = categoryTotals.get(category)!
          totals.sum += value
          totals.count += 1
        }
      }

      // Calculate averages
      for (const [category, totals] of categoryTotals.entries()) {
        data.qualityAverages[category] = totals.count > 0 ? totals.sum / totals.count : 0
      }
    }

    return byTopic
  }
})

/**
 * Gets a specific student's assignment.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getMyAssignment = query({
  args: {
    periodId: v.id("selectionPeriods"),
    studentId: v.string()
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("assignments")
      .withIndex("by_student", (q) =>
        q.eq("studentId", args.studentId)
          .eq("periodId", args.periodId)
      )
      .first()

    if (!assignment) return null

    const topic = await ctx.db.get(assignment.topicId)
    return {
      assignment,
      topic,
      wasPreference: assignment.originalRank !== undefined,
      wasTopChoice: assignment.originalRank === 1
    }
  }
})

/**
 * Gets assignment statistics for a period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAssignmentStats = query({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_period", (q) => q.eq("periodId", args.periodId))
      .collect()

    if (assignments.length === 0) return null

    const stats = {
      totalAssignments: assignments.length,
      matchedPreferences: assignments.filter(a => a.originalRank !== undefined).length,
      topChoices: assignments.filter(a => a.originalRank === 1).length,
      distribution: {} as Record<string, number>
    }

    // Count students per topic
    for (const assignment of assignments) {
      const topicId = assignment.topicId as string
      stats.distribution[topicId] = (stats.distribution[topicId] || 0) + 1
    }

    return stats
  }
})

/**
 * Gets all assignments for CSV export (admin only).
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAllAssignmentsForExport = query({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)

    if (!period || !SelectionPeriod.isAssigned(period)) {
      return null
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_period", (q) => q.eq("periodId", args.periodId))
      .collect()

    // Get topic details
    const topics = await ctx.db.query("topics").collect()
    const topicMap = new Map(topics.map(t => [t._id, t]))

    // Return flat format for CSV export
    return assignments.map(assignment => ({
      student_id: assignment.studentId,
      assigned_topic: topicMap.get(assignment.topicId)?.title || "Unknown Topic"
    }))
  }
})

/**
 * Internal queries for CP-SAT solver integration
 */

export const getPeriodForSolver = internalQuery({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.periodId)
  }
})

export const getPreferencesForSolver = internalQuery({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    if (!period) return []

    return await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .collect()
  }
})

export const getTopicsForSolver = internalQuery({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    if (!period) return []

    return await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()
  }
})

export const getStudentAnswersForSolver = internalQuery({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    // Query all student answers and filter by period
    // Note: by_student_period index is [studentId, selectionPeriodId], so we can't query by periodId alone
    const allAnswers = await ctx.db.query("studentAnswers").collect()
    return allAnswers.filter(a => a.selectionPeriodId === args.periodId)
  }
})

export const getQuestionsForSolver = internalQuery({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    if (!period) return []

    // Get questions linked to this period
    const selectionQuestions = await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", q => q.eq("selectionPeriodId", args.periodId))
      .collect()

    // Get full question details
    const questionIds = selectionQuestions.map(sq => sq.questionId)
    const questions = await Promise.all(
      questionIds.map(id => ctx.db.get(id))
    )

    return questions.filter((q): q is NonNullable<typeof q> => q !== null)
  }
})

export const getAccessListForSolver = internalQuery({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("periodStudentAllowList")
      .withIndex("by_period", q => q.eq("selectionPeriodId", args.periodId))
      .collect()
  }
})

/**
 * Saves assignments from CP-SAT solver.
 * 
 * @category Internal Mutations
 * @since 0.3.0
 */
export const saveCPSATAssignments = internalMutation({
  args: {
    periodId: v.id("selectionPeriods"),
    assignments: v.array(v.object({
      studentId: v.string(),
      topicId: v.id("topics"),
      rank: v.optional(v.number())
    }))
  },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)

    if (!period) {
      throw new Error("Selection period not found")
    }

    if (SelectionPeriod.isAssigned(period)) {
      return period.assignmentBatchId // Already assigned
    }

    // Create batch ID
    const batchId = Assignment.createBatchId(args.periodId)

    // Insert all assignments
    for (const assignment of args.assignments) {
      await ctx.db.insert("assignments", Assignment.make({
        periodId: args.periodId,
        batchId,
        studentId: assignment.studentId,
        topicId: assignment.topicId,
        assignedAt: Date.now(),
        originalRank: assignment.rank
      }))
    }

    // Update period status to assigned
    await ctx.db.replace(args.periodId, SelectionPeriod.assign(batchId)(
      SelectionPeriod.isClosed(period)
        ? period
        : SelectionPeriod.makeClosed({
            semesterId: period.semesterId,
            title: period.title,
            description: period.description,
            openDate: period.openDate,
            closeDate: period.closeDate
          })
    ))

    return batchId
  }
})
