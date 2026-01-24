"use node"

import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import type { Doc } from "./_generated/dataModel"
import { createHmac, timingSafeEqual } from "crypto"

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
const DEFERRED_ASSIGNMENT_CALLBACK_PATH = "/deferredAssignments/callback"

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
    const allCategories = await ctx.runQuery(internal.constraints.getAllConstraintsForSolver, {
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
 * Initiates a deferred assignment evaluation with the solver.
 *
 * @category Actions
 * @since 0.3.0
 */
export const requestDeferredAssignment = internalAction({
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
  handler: async (ctx, args): Promise<{ deferredId: Id<"deferredAssignments"> }> => {
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

    const isExperiment = period.description.includes("EXCLUSIONS:")

    let studentIds: string[]
    if (isExperiment || !rankingsEnabled) {
      const accessList = await ctx.runQuery(internal.assignments.getAccessListForSolver, { periodId: args.periodId })
      studentIds = accessList.map((a: any) => a.studentId)
    } else {
      studentIds = [...new Set(preferences.map((p: Doc<"preferences">) => p.studentId))]
    }

    if (studentIds.length === 0) {
      throw new Error("No students to assign")
    }

    const allCategories = await ctx.runQuery(internal.constraints.getAllConstraintsForSolver, {
      semesterId: period.semesterId
    })

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

    const { students, ...requestWithoutStudents } = cpSatInput
    const deferredId = await ctx.runMutation(internal.deferredAssignments.createDeferredAssignment, {
      kind: "cpsat",
      periodId: args.periodId,
      request: requestWithoutStudents
    })

    const callbackBase =
      process.env.DEFERRED_ASSIGNMENT_CALLBACK_URL ||
      process.env.CONVEX_SITE_URL
    if (!callbackBase) {
      await ctx.runMutation(internal.deferredAssignments.failDeferredAssignment, {
        deferredId,
        error: "Missing DEFERRED_ASSIGNMENT_CALLBACK_URL or CONVEX_SITE_URL"
      })
      throw new Error("Missing DEFERRED_ASSIGNMENT_CALLBACK_URL or CONVEX_SITE_URL")
    }

    const callbackUrl = callbackBase.endsWith(DEFERRED_ASSIGNMENT_CALLBACK_PATH)
      ? callbackBase
      : `${callbackBase.replace(/\/$/, "")}${DEFERRED_ASSIGNMENT_CALLBACK_PATH}`

    try {
      const response = await fetch(`${GA_SERVICE_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deferredId,
          callbackUrl,
          input: cpSatInput
        })
      })

      const responseText = await response.text()

      if (!response.ok) {
        await ctx.runMutation(internal.deferredAssignments.failDeferredAssignment, {
          deferredId,
          error: responseText
        })
        throw new Error(`GA service error (${response.status}): ${responseText}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.runMutation(internal.deferredAssignments.failDeferredAssignment, {
          deferredId,
          error: error.message
        })
        throw new Error(`Failed to call GA service: ${error.message}`)
      }
      throw error
    }

    return { deferredId }
  }
})

/**
 * Verifies a hash matches the computed HMAC of the data.
 *
 * @category Actions
 */
export const verifyHash = internalAction({
  args: {
    hashKey: v.string(),
    data: v.any(),
    hash: v.string(),
  },
  handler: async (_ctx, args) => {
    const computedHash = computeDataHash(args.hashKey, args.data);
    return hashesMatch(computedHash, args.hash);
  },
});

/**
 * Persists deferred assignment results into the assignments table.
 *
 * @category Actions
 */
export const applyDeferredAssignment = internalAction({
  args: {
    deferredId: v.id("deferredAssignments"),
    data: v.any()
  },
  handler: async (ctx, args): Promise<{ applied: boolean }> => {
    const deferred = await ctx.runQuery(internal.deferredAssignments.getDeferredAssignment, {
      deferredId: args.deferredId
    })
    if (!deferred) {
      throw new Error("Deferred assignment not found")
    }

    const period = await ctx.runQuery(internal.assignments.getPeriodForSolver, {
      periodId: deferred.periodId
    })
    if (!period) {
      throw new Error("Period not found")
    }

    const rankingsEnabled = period.rankingsEnabled !== false
    const preferences: Array<Doc<"preferences">> = rankingsEnabled
      ? await ctx.runQuery(internal.assignments.getPreferencesForSolver, { periodId: deferred.periodId })
      : []
    const topics: Array<Doc<"topics">> = await ctx.runQuery(internal.assignments.getTopicsForSolver, {
      periodId: deferred.periodId
    })

    if (topics.length === 0) {
      throw new Error("No active topics found for assignment")
    }

    const isExperiment = period.description.includes("EXCLUSIONS:")
    let studentIds: string[]
    if (isExperiment || !rankingsEnabled) {
      const accessList = await ctx.runQuery(internal.assignments.getAccessListForSolver, {
        periodId: deferred.periodId
      })
      studentIds = accessList.map((a: any) => a.studentId)
    } else {
      studentIds = [...new Set(preferences.map((p: Doc<"preferences">) => p.studentId))]
    }

    if (studentIds.length === 0) {
      throw new Error("No students to assign")
    }

    const rawAssignments = args.data?.assignments
    if (!Array.isArray(rawAssignments) || rawAssignments.length === 0) {
      const status = typeof args.data?.status === "string" ? args.data.status : "unknown"
      throw new Error(`No assignments returned (status: ${status})`)
    }

    const assignments = transformFromCPSATFormat(
      { assignments: rawAssignments },
      topics,
      preferences,
      studentIds
    )

    if (assignments.length === 0) {
      throw new Error("No assignments could be mapped from solver output")
    }

    await ctx.runMutation(internal.assignments.saveCPSATAssignments, {
      periodId: deferred.periodId,
      assignments
    })

    return { applied: true }
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
  });
}

function computeDataHash(secret: string, data: unknown): string {
  const payload = stableStringify(data);
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function hashesMatch(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(",")}}`;
}
