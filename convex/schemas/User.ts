import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for User objects.
 * Stores authenticated user information from Auth0.
 * 
 * @category Validators
 * @since 0.2.0
 */
export const User = v.object({
  // Auth0 subject identifier (unique per user)
  authId: v.string(),
  // User's email address
  email: v.string(),
  // User's display name (optional, from Auth0)
  name: v.optional(v.string()),
  // Whether the user is on the allow-list and allowed for restricted projects
  isAllowed: v.boolean(),
  // Timestamp of last login
  lastLoginAt: v.number(),
})

/**
 * User type representing an authenticated user.
 * 
 * @category Types
 * @since 0.2.0
 */
export type User = Readonly<Infer<typeof User>>

/**
 * Creates a new User.
 * 
 * @category Constructors
 * @since 0.2.0
 */
export const make = (params: {
  readonly authId: string
  readonly email: string
  readonly name?: string
  readonly isAllowed?: boolean
}): User => ({
  authId: params.authId,
  email: params.email,
  name: params.name,
  isAllowed: params.isAllowed ?? false,
  lastLoginAt: Date.now(),
})

