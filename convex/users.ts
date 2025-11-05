import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"

/**
 * Get or create a user record when they sign in
 * This bridges Clerk authentication with our student ID system
 */
export const getOrCreateUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first()

    if (existingUser) {
      // Update user info if needed
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        lastSeen: Date.now(),
      })
      return existingUser._id
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      studentId: args.studentId,
      role: "student",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    })

    return userId
  },
})

/**
 * Update user's student ID
 * This allows linking existing Clerk accounts to student IDs
 */
export const updateStudentId = mutation({
  args: {
    clerkUserId: v.string(),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Check if student ID is already taken
    const existingStudent = await ctx.db
      .query("users")
      .withIndex("by_student_id", (q) => q.eq("studentId", args.studentId))
      .first()

    if (existingStudent && existingStudent._id !== user._id) {
      throw new Error("Student ID already taken")
    }

    await ctx.db.patch(user._id, {
      studentId: args.studentId,
    })

    return user._id
  },
})

/**
 * Sync user from Clerk webhook
 * Called by webhook endpoint when users are created/updated in Clerk
 */
export const syncUserFromWebhook = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first()

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        lastSeen: Date.now(),
      })
      return existingUser._id
    }

    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: "student",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    })
  },
})

/**
 * Get user by Clerk ID (generic, takes clerkUserId as argument)
 */
export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: (ctx, args) =>
    ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", args.clerkUserId))
      .first()
})

/**
 * Get current user (from auth context)
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .first()
  }
})

/**
 * Get user by student ID (for admin functions)
 */
export const getUserByStudentId = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_student_id", (q) => q.eq("studentId", args.studentId))
      .first()
  },
})
