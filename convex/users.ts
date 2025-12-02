import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server"
import { v } from "convex/values"
import * as User from "./schemas/User"

/**
 * Get the current user's identity from Auth0.
 * Returns null if not authenticated.
 */
export async function getCurrentUserIdentity(ctx: QueryCtx | MutationCtx) {
  return await ctx.auth.getUserIdentity()
}

/**
 * Get the current user from the database.
 * Returns null if not authenticated or user not found.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  return await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
    .first()
}

/**
 * Check if an email is on the allow-list.
 */
export async function isEmailAllowed(ctx: QueryCtx | MutationCtx, email: string) {
  const entry = await ctx.db
    .query("allowList")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim()))
    .first()
  return entry !== null
}

/**
 * Store or update user after Auth0 login.
 * Called by the frontend after successful authentication.
 * 
 * @category Mutations
 * @since 0.2.0
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .first()

    const email = identity.email ?? ""
    
    // Check if user's email is on the allow-list
    const onAllowList = await isEmailAllowed(ctx, email)

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email,
        name: identity.name,
        isAllowed: onAllowList,
        lastLoginAt: Date.now(),
      })
      return existingUser._id
    }

    // Create new user
    const newUser = User.make({
      authId: identity.subject,
      email,
      name: identity.name,
      isAllowed: onAllowList,
    })

    return await ctx.db.insert("users", newUser)
  },
})

/**
 * Get the current authenticated user.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx)
  },
})

/**
 * Check if the current user is allowed for restricted content.
 * 
 * @category Queries
 * @since 0.2.0
 */
export const checkUserAllowed = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      return { authenticated: false, isAllowed: false }
    }
    return { authenticated: true, isAllowed: user.isAllowed }
  },
})

// ============================================================================
// ALLOW-LIST MANAGEMENT (Admin functions)
// ============================================================================

/**
 * Add an email to the allow-list.
 * 
 * @category Mutations (Admin)
 * @since 0.2.0
 */
export const addToAllowList = mutation({
  args: {
    email: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"

    const normalizedEmail = args.email.toLowerCase().trim()

    // Check if already exists
    const existing = await ctx.db
      .query("allowList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first()

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        note: args.note,
        addedBy,
        addedAt: Date.now(),
      })
      return existing._id
    }

    // Create new entry
    return await ctx.db.insert("allowList", {
      email: normalizedEmail,
      note: args.note,
      addedAt: Date.now(),
      addedBy,
    })
  },
})

/**
 * Add multiple emails to the allow-list (bulk import).
 * 
 * @category Mutations (Admin)
 * @since 0.2.0
 */
export const bulkAddToAllowList = mutation({
  args: {
    emails: v.array(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const addedBy = identity?.email ?? "system"

    const results = { added: 0, updated: 0 }

    for (const email of args.emails) {
      const normalizedEmail = email.toLowerCase().trim()
      if (!normalizedEmail) continue

      const existing = await ctx.db
        .query("allowList")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          note: args.note,
          addedBy,
          addedAt: Date.now(),
        })
        results.updated++
      } else {
        await ctx.db.insert("allowList", {
          email: normalizedEmail,
          note: args.note,
          addedAt: Date.now(),
          addedBy,
        })
        results.added++
      }
    }

    // Also update any existing users whose email is now on the allow-list
    for (const email of args.emails) {
      const normalizedEmail = email.toLowerCase().trim()
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .first()
      
      if (user && !user.isAllowed) {
        await ctx.db.patch(user._id, { isAllowed: true })
      }
    }

    return results
  },
})

/**
 * Remove an email from the allow-list.
 * 
 * @category Mutations (Admin)
 * @since 0.2.0
 */
export const removeFromAllowList = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim()

    const entry = await ctx.db
      .query("allowList")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first()

    if (entry) {
      await ctx.db.delete(entry._id)
    }

    // Also update the user's isAllowed status
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first()
    
    if (user) {
      await ctx.db.patch(user._id, { isAllowed: false })
    }

    return { success: true }
  },
})

/**
 * Get all entries in the allow-list.
 * 
 * @category Queries (Admin)
 * @since 0.2.0
 */
export const getAllowList = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("allowList").collect()
  },
})

/**
 * Get all users.
 * 
 * @category Queries (Admin)
 * @since 0.2.0
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect()
  },
})

