import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for User objects (authenticated teachers/admins).
 * 
 * @category Validators
 * @since 0.2.0
 */
export const User = v.object({
  authId: v.string(),           // Auth0 subject ID
  email: v.string(),
  name: v.optional(v.string()),
  lastLoginAt: v.number(),
})

/**
 * User type representing an authenticated teacher/admin.
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
}): User => ({
  authId: params.authId,
  email: params.email,
  name: params.name,
  lastLoginAt: Date.now(),
})
