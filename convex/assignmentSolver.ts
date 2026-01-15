import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

/**
 * CP-SAT Service URL - defaults to localhost for development
 */
const CP_SAT_SERVICE_URL = process.env.CP_SAT_SERVICE_URL || "http://localhost:8000"

/**
 * Solves assignment using CP-SAT algorithm.
 * 
 * @category Actions
 * @since 0.3.0
 */
export const solveAssignment = internalAction({
  args: {
    periodId: v.id("selectionPeriods"),
  },
  handler: async (ctx, args) => {
    // Fetch all data needed for the solver
    const period = await ctx.runQuery(internal.assignments.getPeriodForSolver, { periodId: args.periodId })
    if (!period) {
      throw new Error("Period not found")
    }

    const preferences = await ctx.runQuery(internal.assignments.getPreferencesForSolver, { periodId: args.periodId })
    const topics = await ctx.runQuery(internal.assignments.getTopicsForSolver, { periodId: args.periodId })
    const studentAnswers = await ctx.runQuery(internal.assignments.getStudentAnswersForSolver, { periodId: args.periodId })
    const questions = await ctx.runQuery(internal.assignments.getQuestionsForSolver, { periodId: args.periodId })

    if (topics.length === 0) {
      throw new Error("No active topics found for assignment")
    }

    // Get unique student IDs from preferences
    const studentIds = [...new Set(preferences.map(p => p.studentId))]
    if (studentIds.length === 0) {
      throw new Error("No students to assign")
    }

    // Transform to CP-SAT format
    const cpSatInput = transformToCPSATFormat({
      period,
      preferences,
      topics,
      studentAnswers,
      questions,
      studentIds
    })

    // Call CP-SAT service
    try {
      const response = await fetch(`${CP_SAT_SERVICE_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cpSatInput)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`CP-SAT service error (${response.status}): ${errorText}`)
      }

      const result = await response.json()

      // Transform results back to assignments
      return transformFromCPSATFormat(result, topics, preferences, studentIds)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to call CP-SAT service: ${error.message}`)
      }
      throw error
    }
  }
})

/**
 * Transforms Convex data to CP-SAT input format.
 */
function transformToCPSATFormat(data: {
  period: any
  preferences: any[]
  topics: any[]
  studentAnswers: any[]
  questions: any[]
  studentIds: string[]
}) {
  const { preferences, topics, studentAnswers, questions, studentIds } = data

  // Map student IDs to indices
  const studentIdMap = new Map<string, number>()
  studentIds.forEach((id, index) => studentIdMap.set(id, index))

  // Map topic IDs to indices
  const topicIdMap = new Map<Id<"topics">, number>()
  topics.forEach((topic, index) => topicIdMap.set(topic._id, index))

  // Build question map for quick lookup
  const questionMap = new Map<Id<"questions">, any>()
  for (const question of questions) {
    questionMap.set(question._id, question)
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
  // Calculate target group size (even distribution)
  const targetGroupSize = Math.ceil(studentIds.length / topics.length)
  const groups = topics.map((topic, index) => ({
    id: index,
    size: targetGroupSize,
    criteria: {} as Record<string, { type: string; min_ratio?: number; target?: number }>
  }))

  // Add criteria based on question categories
  // For now, we'll add basic criteria - can be extended based on requirements
  const categories = new Set<string>()
  for (const question of questions) {
    if (question.category) {
      categories.add(question.category)
    }
  }

  // Add criteria to groups (example: ensure diversity in categories)
  // This can be customized based on your requirements
  for (const category of categories) {
    // Add a constraint to ensure at least 20% of students in each group have this category
    // This is just an example - adjust based on your needs
    for (const group of groups) {
      group.criteria[category] = {
        type: "constraint",
        min_ratio: 0.2
      }
    }
  }

  // Build students with possible_groups from preferences
  const students = studentIds.map((studentId, index) => {
    const pref = preferences.find(p => p.studentId === studentId)
    const possibleGroups = pref
      ? pref.topicOrder
          .map(topicId => topicIdMap.get(topicId))
          .filter((id): id is number => id !== undefined)
      : topics.map((_, i) => i) // All groups if no preference

    // Get student values (aggregated by category)
    const studentValues: Record<string, number> = {}
    const values = studentValuesMap.get(studentId) || {}
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "number") {
        studentValues[key] = value
      }
    }

    return {
      id: index,
      possible_groups: possibleGroups.length > 0 ? possibleGroups : topics.map((_, i) => i),
      values: studentValues
    }
  })

  return {
    num_students: studentIds.length,
    num_groups: topics.length,
    exclude: [], // Can add student exclusion pairs here if needed
    groups,
    students
  }
}

/**
 * Transforms CP-SAT output to assignment format.
 */
function transformFromCPSATFormat(
  result: { assignments: Array<{ student: number; group: number }> },
  topics: Array<{ _id: Id<"topics"> }>,
  preferences: Array<{ studentId: string; topicOrder: Id<"topics">[] }>,
  studentIds: string[]
): Array<{ studentId: string; topicId: Id<"topics">; rank?: number }> {
  // Build preference map for rank lookup
  const preferenceMap = new Map<string, Map<Id<"topics">, number>>()

  for (const pref of preferences) {
    if (!preferenceMap.has(pref.studentId)) {
      preferenceMap.set(pref.studentId, new Map())
    }
    pref.topicOrder.forEach((topicId, index) => {
      preferenceMap.get(pref.studentId)!.set(topicId, index + 1)
    })
  }

  return result.assignments.map(({ student, group }) => {
    const studentId = studentIds[student]
    const topicId = topics[group]._id
    const rank = preferenceMap.get(studentId)?.get(topicId)

    return { studentId, topicId, rank }
  })
}
