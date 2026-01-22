/**
 * UUID-based slug generation utilities for shareable links.
 *
 * @module
 */

/**
 * Branded type for shareable slugs to ensure type safety.
 * Prevents accidental mixing of regular strings with validated slugs.
 *
 * @category Types
 * @since 0.1.0
 */
export type ShareableSlug = string & { readonly _brand: "ShareableSlug" }

/**
 * UUID v4 validation pattern.
 * Matches the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where y is one of [8, 9, a, b]
 *
 * @internal
 */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Generates a cryptographically secure, non-guessable UUID-based slug.
 * Uses crypto.randomUUID() which is available in Convex runtime.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * import { generateShareableSlug } from "./lib/slugGenerator"
 *
 * const slug = generateShareableSlug()
 * // => "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 */
export const generateShareableSlug = (): ShareableSlug => {
  return crypto.randomUUID() as ShareableSlug
}

/**
 * Type guard to validate if a string is a valid ShareableSlug.
 * Checks for UUID v4 format compliance.
 *
 * @category Guards
 * @since 0.1.0
 * @example
 * import { isShareableSlug } from "./lib/slugGenerator"
 *
 * if (isShareableSlug(userInput)) {
 *   // userInput is now typed as ShareableSlug
 *   processSlug(userInput)
 * }
 */
export const isShareableSlug = (s: string): s is ShareableSlug => {
  return UUID_V4_PATTERN.test(s)
}

/**
 * Safely parses a string into a ShareableSlug.
 * Returns null if the string is not a valid UUID v4.
 *
 * @category Parsers
 * @since 0.1.0
 * @example
 * import { parseShareableSlug } from "./lib/slugGenerator"
 *
 * const slug = parseShareableSlug("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")
 * if (slug !== null) {
 *   // slug is typed as ShareableSlug
 * }
 */
export const parseShareableSlug = (s: string): ShareableSlug | null => {
  return isShareableSlug(s) ? s : null
}
