import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server"

/**
 * Get current authenticated user identity from Auth0
 */
export async function getCurrentUserIdentity(ctx: QueryCtx | MutationCtx) {
  return await ctx.auth.getUserIdentity()
}

/**
 * Get current user from database
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
 * Store/update user after Auth0 login (called by frontend)
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .first()

    const email = identity.email ?? ""

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email,
        name: identity.name,
        lastLoginAt: Date.now(),
      })
      return existingUser._id
    }

    return await ctx.db.insert("users", {
      authId: identity.subject,
      email,
      name: identity.name,
      lastLoginAt: Date.now(),
    })
  },
})

/**
 * Get current authenticated user
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx)
  },
})

/**
 * Get all registered users (admin only)
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    return await ctx.db.query("users").collect()
  },
})

/**
 * Get user by email
 */
export const getUserByEmail = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.email) return null

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!.toLowerCase()))
      .first()
  },
})
