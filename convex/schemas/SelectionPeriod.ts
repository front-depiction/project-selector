import { v } from "convex/values"
import type { Infer } from "convex/values"

/**
 * Convex validator for SelectionPeriod objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const SelectionPeriod = v.object({
  semesterId: v.string(),
  title: v.string(),
  description: v.string(),
  openDate: v.number(),
  closeDate: v.number(),
  isActive: v.boolean()
})

/**
 * SelectionPeriod type representing a selection time window.
 * 
 * @category Types
 * @since 0.1.0
 */
export type SelectionPeriod = Readonly<Infer<typeof SelectionPeriod>>

/**
 * Creates a new SelectionPeriod.
 * 
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as SelectionPeriod from "./schemas/SelectionPeriod"
 * 
 * const period = SelectionPeriod.make({
 *   semesterId: "2024-spring",
 *   title: "Spring 2024 Project Selection",
 *   description: "Choose your capstone project for the spring semester",
 *   openDate: new Date("2024-03-01").getTime(),
 *   closeDate: new Date("2024-03-15").getTime()
 * })
 */
export const make = (params: {
  readonly semesterId: string
  readonly title: string
  readonly description: string
  readonly openDate: number
  readonly closeDate: number
  readonly isActive?: boolean
}): SelectionPeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isActive: params.isActive ?? false
} as const)

/**
 * Activates a selection period.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const activate = (period: SelectionPeriod): SelectionPeriod => ({
  ...period,
  isActive: true
} as const)

/**
 * Deactivates a selection period.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const deactivate = (period: SelectionPeriod): SelectionPeriod => ({
  ...period,
  isActive: false
} as const)

/**
 * Checks if a selection period is currently open.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isOpen = (now: number = Date.now()) => (period: SelectionPeriod): boolean =>
  period.isActive && now >= period.openDate && now <= period.closeDate

/**
 * Checks if a selection period has not yet opened.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isUpcoming = (now: number = Date.now()) => (period: SelectionPeriod): boolean =>
  period.isActive && now < period.openDate

/**
 * Checks if a selection period has closed.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isClosed = (now: number = Date.now()) => (period: SelectionPeriod): boolean =>
  !period.isActive || now > period.closeDate

/**
 * Gets the status of a selection period.
 * 
 * @category Getters
 * @since 0.1.0
 */
export const getStatus = (now: number = Date.now()) => (
  period: SelectionPeriod
): "inactive" | "upcoming" | "open" | "closed" => {
  if (!period.isActive) return "inactive"
  if (now < period.openDate) return "upcoming"
  if (now <= period.closeDate) return "open"
  return "closed"
}