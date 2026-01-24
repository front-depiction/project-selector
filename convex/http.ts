import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

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
    });
  }),
});

http.route({
  path: "/deferredAssignments/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const hashKey = process.env.DEFERRED_ASSIGNMENT_HASH_KEY;
    if (!hashKey) {
      return new Response("Missing DEFERRED_ASSIGNMENT_HASH_KEY", { status: 500 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch (error) {
      return new Response("Invalid JSON payload", { status: 400 });
    }

    const deferredId = payload?.deferredId;
    const evaluationId = payload?.evaluationId;
    const data = payload?.data;
    const hash = payload?.hash;

    if (typeof deferredId !== "string" || typeof evaluationId !== "string" || typeof hash !== "string") {
      return new Response("Missing deferredId, evaluationId, or hash", { status: 400 });
    }

    const isValid = await ctx.runAction(internal.assignmentSolver.verifyHash, {
      hashKey,
      data,
      hash,
    });
    if (!isValid) {
      return new Response("Hash mismatch", { status: 401 });
    }

    const deferredIdValue = deferredId as Id<"deferredAssignments">;
    await ctx.runMutation(internal.deferredAssignments.completeDeferredAssignment, {
      deferredId: deferredIdValue,
      evaluationId,
      data,
      dataHash: hash
    });

    try {
      await ctx.runAction(internal.assignmentSolver.applyDeferredAssignment, {
        deferredId: deferredIdValue,
        data
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      await ctx.runMutation(internal.deferredAssignments.failDeferredAssignment, {
        deferredId: deferredIdValue,
        error: errorMessage
      })
      return new Response(`Failed to persist assignments: ${errorMessage}`, { status: 500 })
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }),
});

// Convex expects the router to be the default export of convex/http.ts
export default http;
