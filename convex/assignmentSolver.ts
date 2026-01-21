"use node"

import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import type { Doc } from "./_generated/dataModel"

/**
 * Assignment Solver Service URL
 *
 * Uses Railway-hosted GA solver for production assignments.
 * For local development, you can override with GA_SERVICE_URL or CP_SAT_SERVICE_URL env var.
 */
const GA_SERVICE_URL =
  process.env.GA_SERVICE_URL ||
  process.env.CP_SAT_SERVICE_URL ||
  "https://assignment-cpsat-production.up.railway.app"

type AssignmentResult = Array<{ studentId: string; topicId: Id<"topics">; rank?: number }>
type SolverSettings = {
  rankingPercentage?: number
  maxTimeInSeconds?: number
  groupSizes?: Array<{ topicId: Id<"topics">; size: number }>
}

/**
 * Solves assignment using CP-SAT algorithm.
 * 
 * @category Actions
 * @since 0.3.0
 */
export const solveAssignment = internalAction({
  args: {
    periodId: v.id("selectionPeriods"),
    settings: v.optional(v.object({
      rankingPercentage: v.optional(v.number()),
      maxTimeInSeconds: v.optional(v.number()),
      groupSizes: v.optional(v.array(v.object({
        topicId: v.id("topics"),
        size: v.number()
      })))
    }))
  },
  handler: async (ctx, args): Promise<AssignmentResult> => {
    // Fetch all data needed for the solver
    const period = await ctx.runQuery(internal.assignments.getPeriodForSolver, { periodId: args.periodId })
    if (!period) {
      throw new Error("Period not found")
    }

    const rankingsEnabled = period.rankingsEnabled !== false
    const preferences: Array<Doc<"preferences">> = rankingsEnabled
      ? await ctx.runQuery(internal.assignments.getPreferencesForSolver, { periodId: args.periodId })
      : []
    const topics: Array<Doc<"topics">> = await ctx.runQuery(internal.assignments.getTopicsForSolver, { periodId: args.periodId })
    const studentAnswers: Array<Doc<"studentAnswers">> = await ctx.runQuery(internal.assignments.getStudentAnswersForSolver, { periodId: args.periodId })
    const questions: Array<Doc<"questions"> | null> = await ctx.runQuery(internal.assignments.getQuestionsForSolver, { periodId: args.periodId })

    if (topics.length === 0) {
      throw new Error("No active topics found for assignment")
    }

    // Check if this is an experiment period (doesn't require topic preferences)
    const isExperiment = period.description.includes("EXCLUSIONS:")

    // Get unique student IDs - either from preferences or from access list for experiments
    let studentIds: string[]
    if (isExperiment || !rankingsEnabled) {
      // For experiment periods, get students from access list
      const accessList = await ctx.runQuery(internal.assignments.getAccessListForSolver, { periodId: args.periodId })
      studentIds = accessList.map((a: any) => a.studentId)
    } else {
      // For normal periods, get students from preferences
      studentIds = [...new Set(preferences.map((p: Doc<"preferences">) => p.studentId))]
    }
    
    if (studentIds.length === 0) {
      throw new Error("No students to assign")
    }

    // Fetch categories for criterion types
    const allCategories = await ctx.runQuery(internal.categories.getAllCategoriesForSolver, {
      semesterId: period.semesterId
    })

    // Transform to CP-SAT format
    const solverSettings = rankingsEnabled
      ? args.settings
      : args.settings
        ? { ...args.settings, rankingPercentage: undefined }
        : undefined

    const cpSatInput = transformToCPSATFormat({
      period,
      preferences,
      topics,
      studentAnswers,
      questions,
      studentIds,
      categories: allCategories,
      settings: solverSettings
    })

    // Call GA service
    try {
      const requestBody = JSON.stringify(cpSatInput)
      const response = await fetch(`${GA_SERVICE_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody
      })

      const responseText = await response.text()

      if (!response.ok) {
        throw new Error(`GA service error (${response.status}): ${responseText}`)
      }

      const result = JSON.parse(responseText)

      // Transform results back to assignments
      return transformFromCPSATFormat(result, topics, preferences, studentIds)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to call GA service: ${error.message}`)
      }
      throw error
    }
  }
})

/**
 * Transforms Convex data to CP-SAT input format.
 */
function transformToCPSATFormat(data: {
  period: Doc<"selectionPeriods">
  preferences: Array<Doc<"preferences">>
  topics: Array<Doc<"topics">>
  studentAnswers: Array<Doc<"studentAnswers">>
  questions: Array<Doc<"questions"> | null>
  studentIds: string[]
  categories: Array<Doc<"categories">>
  settings?: SolverSettings
}) {
  const { period, preferences, topics, studentAnswers, questions, studentIds, categories, settings } = data

  // Map student IDs to indices
  const studentIdMap = new Map<string, number>()
  studentIds.forEach((id, index) => studentIdMap.set(id, index))

  // Map topic IDs to indices
  const topicIdMap = new Map<Id<"topics">, number>()
  topics.forEach((topic, index) => topicIdMap.set(topic._id, index))

  // Build question map for quick lookup
  const questionMap = new Map<Id<"questions">, Doc<"questions">>()
  for (const question of questions) {
    if (question) {
      questionMap.set(question._id, question)
    }
  }

  // Group student answers by student and aggregate by category
  const studentValuesMap = new Map<string, Record<string, number>>()
  
  for (const answer of studentAnswers) {
    const question = questionMap.get(answer.questionId)
    if (!question) continue

    if (!studentValuesMap.has(answer.studentId)) {
      studentValuesMap.set(answer.studentId, {})
    }
    const values = studentValuesMap.get(answer.studentId)!

    // Use category if available, otherwise use question ID as key
    const key = question.category || answer.questionId
    if (!values[key]) {
      values[key] = 0
    }
    // Aggregate normalized answers by category (average)
    // We'll count and sum, then divide later
    if (!values[`${key}_count`]) {
      values[`${key}_count`] = 0
      values[`${key}_sum`] = 0
    }
    values[`${key}_count`] = (values[`${key}_count`] as number) + 1
    values[`${key}_sum`] = (values[`${key}_sum`] as number) + answer.normalizedAnswer
  }

  // Calculate averages for categories
  for (const [studentId, values] of studentValuesMap.entries()) {
    for (const key of Object.keys(values)) {
      if (key.endsWith("_count")) {
        const categoryKey = key.replace("_count", "")
        const count = values[key] as number
        const sum = values[`${categoryKey}_sum`] as number
        if (count > 0) {
          values[categoryKey] = sum / count
        }
        delete values[key]
        delete values[`${categoryKey}_sum`]
      }
    }
  }

  // Build groups (topics) with criteria
  // Calculate target group sizes (even distribution with remainder)
  const numTopics = topics.length
  const baseSize = numTopics > 0 ? Math.floor(studentIds.length / numTopics) : 0
  let remainder = numTopics > 0 ? studentIds.length % numTopics : 0
  const sizeOverrides = new Map<Id<"topics">, number>()
  if (settings?.groupSizes) {
    for (const entry of settings.groupSizes) {
      sizeOverrides.set(entry.topicId, entry.size)
    }
  }
  type CriterionConfig = { type: string; min_ratio?: number }
  const groups = topics.map((topic, index) => ({
    id: index,
    size: sizeOverrides.get(topic._id) ?? (baseSize + (remainder-- > 0 ? 1 : 0)),
    criteria: {} as Record<string, CriterionConfig[]>
  }))

  // Build category map by ID and name for lookup
  const categoryMap = new Map<string, typeof categories[0]>()
  const categoryByName = new Map<string, typeof categories[0]>()
  for (const cat of categories) {
    categoryMap.set(cat._id, cat)
    categoryByName.set(cat.name, cat)
  }

  // 1. Apply balance distribution (minimize) categories from the selection period
  // These are stored in period.minimizeCategoryIds and apply to ALL groups
  if (period.minimizeCategoryIds && period.minimizeCategoryIds.length > 0) {
    for (const categoryId of period.minimizeCategoryIds) {
      const category = categoryMap.get(categoryId)
      if (!category) continue

      const criterionConfig: CriterionConfig = { type: "minimize" }

      // Apply minimize criteria to all groups
      for (const group of groups) {
        group.criteria[category.name] = [criterionConfig]
      }
    }
  }

  // 2. Apply topic-specific criteria (prerequisite and pull) from each topic
  // These are stored in topic.constraintIds and only apply to that specific topic
  for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
    const topic = topics[topicIndex]
    if (!topic.constraintIds || topic.constraintIds.length === 0) continue

    for (const categoryId of topic.constraintIds) {
      const category = categoryMap.get(categoryId)
      if (!category || !category.criterionType) continue

      const group = groups[topicIndex]

      if (category.criterionType === "prerequisite") {
        const criterionConfig: CriterionConfig = {
          type: "prerequisite",
          min_ratio: category.minRatio ?? 0.5
        }
        group.criteria[category.name] = [criterionConfig]
      } else if (category.criterionType === "pull") {
        const criterionConfig: CriterionConfig = {
          type: "pull"
        }
        group.criteria[category.name] = [criterionConfig]
      }
    }
  }

  // Build students with possible_groups from preferences
  const students = studentIds.map((studentId, index) => {
    const pref = preferences.find((p: Doc<"preferences">) => p.studentId === studentId)
    const possibleGroups = pref
      ? pref.topicOrder
          .map((topicId: Id<"topics">) => topicIdMap.get(topicId))
          .filter((id: number | undefined): id is number => id !== undefined)
      : topics.map((_, i) => i) // All groups if no preference

    // Get student values (aggregated by category)
    const studentValues: Record<string, number> = {}
    const values = studentValuesMap.get(studentId) || {}
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "number") {
        studentValues[key] = value
      }
    }

    const rankings = pref && possibleGroups.length > 0
      ? Object.fromEntries(
          possibleGroups.map((groupId, i) => {
            const denom = Math.max(possibleGroups.length - 1, 1)
            const score = possibleGroups.length === 1 ? 1 : 1 - (i / denom)
            return [groupId, score]
          })
        )
      : undefined

    return {
      id: index,
      possible_groups: possibleGroups.length > 0 ? possibleGroups : topics.map((_, i) => i),
      values: studentValues,
      ...(rankings ? { rankings } : {})
    }
  })

  // Build exclusion pairs (students who cannot be in the same group)
  // For experiment: extract from period description if it contains exclusion data
  const exclusions: Array<[number, number]> = []
  
  // Check if period description contains exclusion data in format: "EXCLUSIONS:[[0,1],[2,3]]"
  if (data.period.description.includes("EXCLUSIONS:")) {
    try {
      const match = data.period.description.match(/EXCLUSIONS:(\[\[.*?\]\])/)
      if (match && match[1]) {
        const parsedExclusions = JSON.parse(match[1]) as Array<[number, number]>
        exclusions.push(...parsedExclusions)
      }
    } catch (e) {
      console.warn("Failed to parse exclusion data from period description:", e)
    }
  }

  // Check if period description contains criteria data in format: "CRITERIA:{"0":{"Leader":[{"type":"best_min","min_ratio":0.5}]}}"
  if (data.period.description.includes("CRITERIA:")) {
    try {
      const match = data.period.description.match(/CRITERIA:(\{.*?\})/)
      if (match && match[1]) {
        const customCriteria = JSON.parse(match[1]) as Record<string, Record<string, CriterionConfig[]>>
        for (const [groupIdStr, groupCriteria] of Object.entries(customCriteria)) {
          const groupId = parseInt(groupIdStr)
          const group = groups.find(g => g.id === groupId)
          if (group) {
            for (const [category, configs] of Object.entries(groupCriteria)) {
              group.criteria[category] = configs
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse criteria data from period description:", e)
    }
  }

  const totalGroupSize = groups.reduce((sum, group) => sum + group.size, 0)
  if (settings?.groupSizes && totalGroupSize !== studentIds.length) {
    throw new Error(`Group sizes (${totalGroupSize}) must sum to ${studentIds.length}`)
  }

  const clampedRankingPercentage = settings?.rankingPercentage !== undefined
    ? Math.min(Math.max(settings.rankingPercentage, 0), 99.99)
    : undefined
  const clampedMaxTimeInSeconds = settings?.maxTimeInSeconds !== undefined
    ? Math.min(Math.max(settings.maxTimeInSeconds, 15), 540)
    : undefined

  return {
    num_students: studentIds.length,
    num_groups: topics.length,
    exclude: exclusions,
    groups,
    students,
    ...(clampedRankingPercentage !== undefined ? { ranking_percentage: clampedRankingPercentage } : {}),
    ...(clampedMaxTimeInSeconds !== undefined ? { max_time_in_seconds: clampedMaxTimeInSeconds } : {})
  }
}

/**
 * Transforms CP-SAT output to assignment format.
 */
function transformFromCPSATFormat(
  result: { assignments: Array<{ student?: number; group?: number; student_id?: number; group_id?: number }> },
  topics: Array<Doc<"topics">>,
  preferences: Array<Doc<"preferences">>,
  studentIds: string[]
): AssignmentResult {
  // Build preference map for rank lookup
  const preferenceMap = new Map<string, Map<Id<"topics">, number>>()

  for (const pref of preferences) {
    if (!preferenceMap.has(pref.studentId)) {
      preferenceMap.set(pref.studentId, new Map())
    }
    pref.topicOrder.forEach((topicId: Id<"topics">, index: number) => {
      preferenceMap.get(pref.studentId)!.set(topicId, index + 1)
    })
  }

  return result.assignments.map((assignment) => {
    const studentIndex = assignment.student_id ?? assignment.student ?? 0
    const groupIndex = assignment.group_id ?? assignment.group ?? 0
    const studentId = studentIds[studentIndex]
    const topicId = topics[groupIndex]._id
    const rank = preferenceMap.get(studentId)?.get(topicId)

    return { studentId, topicId, rank }
  })
}
