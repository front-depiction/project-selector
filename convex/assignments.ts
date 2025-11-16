import { v } from "convex/values"
import { mutation, internalMutation, query, MutationCtx } from "./_generated/server"
import { Id } from "./_generated/dataModel"
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
): Promise<string> {
  const period = await ctx.db.get(periodId)

  if (!period) {
    throw new Error("Selection period not found")
  }

  if (SelectionPeriod.isAssigned(period)) {
    return period.assignmentBatchId // Already assigned
  }

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

  if (topics.length === 0) {
    throw new Error("No active topics found for assignment")
  }

  // Get unique student IDs
  const studentIds = [...new Set(preferences.map((p) => p.studentId))]

  if (studentIds.length === 0) {
    throw new Error("No students to assign")
  }

  // Transform preferences with topicOrder into flat ranked preferences
  const flatPreferences = preferences.flatMap((p) =>
    p.topicOrder.map((topicId, index) => ({
      studentId: p.studentId,
      topicId,
      rank: index + 1,
    }))
  )

  // Distribute students evenly
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
 * Distributes students evenly across topics they are eligible for.
 * Each student can only be assigned to topics they have in their preference list
 * (which represents topics they meet prerequisites for).
 * 
 * Uses target sizes to ensure final loads differ by at most 1, and assigns
 * students with fewer eligible topics first for better fairness.
 * 
 * @category Internal Functions
 * @since 0.1.0
 */
function distributeStudents(
  studentIds: string[],
  topics: Array<{ _id: Id<"topics"> }>,
  preferences: Array<{ studentId: string; topicId: Id<"topics">; rank: number }>
): Array<{ studentId: string; topicId: Id<"topics">; rank?: number }> {
  // Create preference lookup map - only contains topics student is eligible for
  const preferenceMap = new Map<string, Map<Id<"topics">, number>>()
  for (const pref of preferences) {
    if (!preferenceMap.has(pref.studentId)) {
      preferenceMap.set(pref.studentId, new Map())
    }
    preferenceMap.get(pref.studentId)!.set(pref.topicId, pref.rank)
  }

  // Create topic eligibility map for each student
  const studentEligibleTopics = new Map<string, Id<"topics">[]>()
  for (const studentId of studentIds) {
    const studentPrefs = preferenceMap.get(studentId)
    if (studentPrefs && studentPrefs.size > 0) {
      studentEligibleTopics.set(studentId, Array.from(studentPrefs.keys()))
    } else {
      // If student has no preferences, they're eligible for all topics
      studentEligibleTopics.set(studentId, topics.map(t => t._id))
    }
  }

  // Sort students by flexibility (fewer eligible topics first)
  const sortedStudents = [...studentIds].sort((a, b) => {
    const aEligible = studentEligibleTopics.get(a)?.length ?? 0
    const bEligible = studentEligibleTopics.get(b)?.length ?? 0
    return aEligible - bEligible
  })

  // Compute target sizes for each topic so final loads differ by at most 1
  const totalStudents = studentIds.length
  const baseTargetSize = Math.floor(totalStudents / topics.length)
  const remainder = totalStudents % topics.length
  
  const targetSizes = new Map<Id<"topics">, number>()
  topics.forEach((topic, index) => {
    // First 'remainder' topics get one extra student
    targetSizes.set(topic._id, baseTargetSize + (index < remainder ? 1 : 0))
  })

  // Track current assignments per topic
  const topicAssignments = new Map<Id<"topics">, number>()
  topics.forEach(topic => topicAssignments.set(topic._id, 0))

  // Distribute students
  const assignments: Array<{ studentId: string; topicId: Id<"topics">; rank?: number }> = []

  for (const studentId of sortedStudents) {
    const eligibleTopics = studentEligibleTopics.get(studentId)!
    
    if (eligibleTopics.length === 0) {
      // Student has no eligible topics (shouldn't happen in normal flow)
      continue
    }

    // Sort eligible topics by:
    // 1. Whether topic is below target size (prefer below target)
    // 2. Current assignment count (fewest first)
    // 3. Preference rank (lower rank = higher preference)
    const sortedTopics = eligibleTopics.sort((a, b) => {
      const aTarget = targetSizes.get(a) ?? 0
      const bTarget = targetSizes.get(b) ?? 0
      const aCurrent = topicAssignments.get(a) ?? 0
      const bCurrent = topicAssignments.get(b) ?? 0
      
      // Prefer topics below target size
      const aBelowTarget = aCurrent < aTarget ? 0 : 1
      const bBelowTarget = bCurrent < bTarget ? 0 : 1
      
      if (aBelowTarget !== bBelowTarget) {
        return aBelowTarget - bBelowTarget
      }
      
      // If both below or both above target, prefer fewer assignments
      if (aCurrent !== bCurrent) {
        return aCurrent - bCurrent
      }
      
      // If same assignment count, prefer higher preference (lower rank)
      const studentPrefs = preferenceMap.get(studentId)
      const aRank = studentPrefs?.get(a) ?? Infinity
      const bRank = studentPrefs?.get(b) ?? Infinity
      
      return aRank - bRank
    })

    // Assign to the best available topic
    const selectedTopicId = sortedTopics[0]
    const studentPrefs = preferenceMap.get(studentId)
    const rank = studentPrefs?.get(selectedTopicId)

    assignments.push({
      studentId,
      topicId: selectedTopicId,
      rank
    })

    // Update assignment count
    topicAssignments.set(selectedTopicId, (topicAssignments.get(selectedTopicId) ?? 0) + 1)
  }

  return assignments
}

/**
 * Gets assignments for a selection period.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getAssignments = query({
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

    // Group by topic with topic details
    const topics = await ctx.db.query("topics").collect()
    const topicMap = new Map(topics.map(t => [t._id, t]))

    const byTopic: Record<string, { topic: typeof topics[0] | undefined; students: Array<{ studentId: string; originalRank?: number; assignedAt: number }> }> = {}

    for (const assignment of assignments) {
      const topicId = assignment.topicId as string
      const topic = topicMap.get(assignment.topicId)

      if (!byTopic[topicId]) {
        byTopic[topicId] = {
          topic: topic,
          students: []
        }
      }

      byTopic[topicId].students.push({
        studentId: assignment.studentId,
        originalRank: assignment.originalRank,
        assignedAt: assignment.assignedAt
      })
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
