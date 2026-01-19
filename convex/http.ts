import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"

const http = httpRouter()

/**
 * Health check endpoint
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }),
})

http.route({
  path: "/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: any
    try {
      payload = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const deferredId = payload?.deferredId
    if (typeof deferredId !== "string") {
      return new Response(JSON.stringify({ error: "Missing deferredId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const error = payload?.error
    if (typeof error === "string" && error.length > 0) {
      await ctx.runMutation(internal.deferredSolverJobs.markDeferredSolverJobFailed, {
        deferredId,
        error,
      })
      return new Response(JSON.stringify({ status: "failed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const assignments = payload?.assignments
    if (!Array.isArray(assignments)) {
      return new Response(JSON.stringify({ error: "Missing assignments" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    try {
      await ctx.runAction(internal.deferredSolverJobs.finalizeDeferredSolverJob, {
        deferredId,
        assignments,
      })
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      await ctx.runMutation(internal.deferredSolverJobs.markDeferredSolverJobFailed, {
        deferredId,
        error: message,
      })
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  }),
})

// Convex expects the router to be the default export of convex/http.ts
export default http
