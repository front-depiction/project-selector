"use node"

import { randomUUID } from "crypto"
import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { transformToCPSATFormat } from "./solverTransforms"

/**
 * Assignment Solver Service URL
 *
 * Uses Railway-hosted GA solver for production assignments.
 * For local development, you can override with GA_SERVICE_URL or CP_SAT_SERVICE_URL env var.
 */
const SOLVER_SERVICE_URL =
  process.env.GA_SERVICE_URL ||
  process.env.CP_SAT_SERVICE_URL ||
  "https://ga-production-2d99.up.railway.app"

const SOLVER_TYPE = process.env.CP_SAT_SERVICE_URL ? "cp-sat" : "ga"
const CALLBACK_URL = process.env.CONVEX_CALLBACK_URL

type SolverAck = { acknowledged: true; deferredId: string }

/**
 * Requests assignment solving via CP-SAT/GA service and returns an ack.
 *
 * @category Actions
 * @since 0.3.0
 */
export const solveAssignment = internalAction({
  args: {
    periodId: v.id("selectionPeriods"),
  },
  handler: async (ctx, args): Promise<SolverAck> => {
    if (!CALLBACK_URL) {
      throw new Error("CONVEX_CALLBACK_URL is not set")
    }

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

    // Check if this is an experiment period (doesn't require topic preferences)
    const isExperiment = period.description.includes("EXCLUSIONS:")

    // Get unique student IDs - either from preferences or from access list for experiments
    let studentIds: string[]
    if (isExperiment) {
      // For experiment periods, get students from access list
      const accessList = await ctx.runQuery(internal.assignments.getAccessListForSolver, { periodId: args.periodId })
      studentIds = accessList.map((a: { studentId: string }) => a.studentId)
    } else {
      // For normal periods, get students from preferences
      studentIds = [...new Set(preferences.map((p: { studentId: string }) => p.studentId))]
    }

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
      studentIds,
    })

    const deferredId = randomUUID()
    const topicIds = topics.map(topic => topic._id)

    await ctx.runMutation(internal.deferredSolverJobs.createDeferredSolverJob, {
      periodId: args.periodId,
      deferredId,
      solverType: SOLVER_TYPE,
      studentIds,
      topicIds,
    })

    // Call solver service
    try {
      const response = await fetch(`${SOLVER_SERVICE_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deferredId,
          callbackUrl: CALLBACK_URL,
          input: cpSatInput,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Solver service error (${response.status}): ${errorText}`)
      }

      return { acknowledged: true, deferredId }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      await ctx.runMutation(internal.deferredSolverJobs.markDeferredSolverJobFailed, {
        deferredId,
        error: message,
      })
      if (error instanceof Error) {
        throw new Error(`Failed to call solver service: ${error.message}`)
      }
      throw error
    }
  },
})
