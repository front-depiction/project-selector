import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { internalAction, internalMutation, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"
import { transformFromCPSATFormat } from "./solverTransforms"

export const getDeferredSolverJobByDeferredId = internalQuery({
  args: { deferredId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deferredSolverJobs")
      .withIndex("by_deferred_id", q => q.eq("deferredId", args.deferredId))
      .unique()
  },
})

export const createDeferredSolverJob = internalMutation({
  args: {
    periodId: v.id("selectionPeriods"),
    deferredId: v.string(),
    solverType: v.union(v.literal("cp-sat"), v.literal("ga")),
    studentIds: v.array(v.string()),
    topicIds: v.array(v.id("topics")),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.insert("deferredSolverJobs", {
      periodId: args.periodId,
      deferredId: args.deferredId,
      solverType: args.solverType,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      studentIds: args.studentIds,
      topicIds: args.topicIds,
    })
  },
})

export const markDeferredSolverJobFailed = internalMutation({
  args: {
    deferredId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("deferredSolverJobs")
      .withIndex("by_deferred_id", q => q.eq("deferredId", args.deferredId))
      .unique()

    if (!job) {
      throw new Error("Deferred solver job not found")
    }

    if (job.status === "failed") {
      return
    }

    const now = Date.now()
    await ctx.db.patch(job._id, {
      status: "failed",
      error: args.error,
      updatedAt: now,
      completedAt: now,
    })
  },
})

export const markDeferredSolverJobCompleted = internalMutation({
  args: {
    deferredId: v.string(),
    assignmentBatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("deferredSolverJobs")
      .withIndex("by_deferred_id", q => q.eq("deferredId", args.deferredId))
      .unique()

    if (!job) {
      throw new Error("Deferred solver job not found")
    }

    if (job.status === "completed") {
      return
    }

    const now = Date.now()
    await ctx.db.patch(job._id, {
      status: "completed",
      assignmentBatchId: args.assignmentBatchId,
      updatedAt: now,
      completedAt: now,
    })
  },
})

export const finalizeDeferredSolverJob = internalAction({
  args: {
    deferredId: v.string(),
    assignments: v.array(v.object({
      student_id: v.optional(v.number()),
      group_id: v.optional(v.number()),
      student: v.optional(v.number()),
      group: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    const job: Doc<"deferredSolverJobs"> | null = await ctx.runQuery(
      internal.deferredSolverJobs.getDeferredSolverJobByDeferredId,
      {
      deferredId: args.deferredId,
      }
    )

    if (!job) {
      throw new Error("Deferred solver job not found")
    }

    if (job.status === "completed") {
      if (!job.assignmentBatchId) {
        throw new Error("Deferred solver job is missing assignment batch ID")
      }
      return job.assignmentBatchId
    }

    const preferences: Array<Doc<"preferences">> = await ctx.runQuery(internal.assignments.getPreferencesForSolver, {
      periodId: job.periodId,
    })
    const topics: Array<Doc<"topics">> = await ctx.runQuery(internal.assignments.getTopicsForSolver, {
      periodId: job.periodId,
    })
    const topicById = new Map<Id<"topics">, Doc<"topics">>(topics.map(topic => [topic._id, topic]))
    const orderedTopics = job.topicIds.map((topicId: Id<"topics">) => {
      const topic = topicById.get(topicId)
      if (!topic) {
        throw new Error(`Topic not found for ID ${topicId}`)
      }
      return topic
    })

    const assignments = transformFromCPSATFormat(
      { assignments: args.assignments },
      orderedTopics,
      preferences,
      job.studentIds,
    )

    const assignmentBatchId: string = await ctx.runMutation(internal.assignments.saveCPSATAssignments, {
      periodId: job.periodId,
      assignments,
    })

    await ctx.runMutation(internal.deferredSolverJobs.markDeferredSolverJobCompleted, {
      deferredId: args.deferredId,
      assignmentBatchId,
    })

    return assignmentBatchId
  },
})
