import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    // Try to find user record with studentId
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();
    
    return {
      email: identity.email,
      studentId: user?.studentId,
      subject: identity.subject,
    };
  },
});

// Mutation to store studentId for authenticated user
export const setStudentId = mutation({
  args: { studentId: v.string() },
  handler: async (ctx, { studentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Validate format
    if (!/^\d{7}$/.test(studentId)) {
      throw new Error("Student ID must be exactly 7 digits");
    }
    
    // Find or create user record
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { studentId });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        studentId,
      });
    }
    
    return { success: true };
  },
});

