import { v } from "convex/values"
import { internalMutation, internalQuery, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import * as DeferredAssignment from "./schemas/DeferredAssignment"

const requestValidator = v.object({
  num_students: v.number(),
  num_groups: v.number(),
  groups: v.array(v.object({
    id: v.number(),
    size: v.number(),
    criteria: v.record(v.string(), v.array(v.object({
      type: v.string(),
      min_ratio: v.optional(v.number())
    })))
  })),
  exclude: v.array(v.array(v.number())),
  ranking_percentage: v.optional(v.number()),
  max_time_in_seconds: v.optional(v.number())
})

export const getDeferredAssignment = internalQuery({
  args: { deferredId: v.id("deferredAssignments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deferredId)
  }
})

export const getDeferredAssignmentStatus = query({
  args: { deferredId: v.id("deferredAssignments") },
  handler: async (ctx, args) => {
    const deferred = await ctx.db.get(args.deferredId)
    if (!deferred) return null

    return {
      status: deferred.status,
      error: deferred.error,
      updatedAt: deferred.updatedAt
    }
  }
})

export const createDeferredAssignment = internalMutation({
  args: {
    kind: v.union(v.literal("cpsat"), v.literal("ga")),
    periodId: v.id("selectionPeriods"),
    request: requestValidator
  },
  handler: async (ctx, args): Promise<Id<"deferredAssignments">> => {
    const now = Date.now()
    const doc = DeferredAssignment.makePending({
      kind: args.kind,
      periodId: args.periodId,
      request: args.request,
      createdAt: now
    })
    return await ctx.db.insert("deferredAssignments", doc)
  }
})

export const completeDeferredAssignment = internalMutation({
  args: {
    deferredId: v.id("deferredAssignments"),
    evaluationId: v.string(),
    data: v.any(),
    dataHash: v.string()
  },
  handler: async (ctx, args) => {
    const deferred = await ctx.db.get(args.deferredId)
    if (!deferred) {
      throw new Error("Deferred assignment not found")
    }

    if (deferred.status === "completed") {
      return
    }

    await ctx.db.patch(args.deferredId, {
      status: "completed",
      evaluationId: args.evaluationId,
      data: args.data,
      dataHash: args.dataHash,
      updatedAt: Date.now()
    })
  }
})

export const failDeferredAssignment = internalMutation({
  args: {
    deferredId: v.id("deferredAssignments"),
    error: v.string()
  },
  handler: async (ctx, args) => {
    const deferred = await ctx.db.get(args.deferredId)
    if (!deferred) {
      throw new Error("Deferred assignment not found")
    }

    await ctx.db.patch(args.deferredId, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now()
    })
  }
})
