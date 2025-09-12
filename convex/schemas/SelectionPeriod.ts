import { v } from "convex/values"
import type { Infer } from "convex/values"
import { Id } from "../_generated/dataModel"

/**
 * Convex validator for SelectionPeriod objects.
 * 
 * @category Validators
 * @since 0.1.0
 */
export const SelectionPeriod = v.union(
  v.object({
    semesterId: v.string(),
    title: v.string(),
    description: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean(),
    status: v.literal("open"),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions"))
  }),
  v.object({
    semesterId: v.string(),
    title: v.string(),
    description: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean(),
    status: v.literal("assigned"),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
    assignmentBatchId: v.string()
  })
)

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
 *   closeDate: new Date("2024-03-15").getTime(),
 *   scheduledFunctionId: "sched_123" as any
 * })
 */
export const make = (params: {
  readonly semesterId: string
  readonly title: string
  readonly description: string
  readonly openDate: number
  readonly closeDate: number
  readonly isActive?: boolean
  readonly status?: "open" | "assigned"
  readonly scheduledFunctionId?: Id<"_scheduled_functions">
  readonly assignmentBatchId?: string
}): SelectionPeriod => {
  const status = params.status ?? "open"
  
  if (status === "assigned") {
    if (!params.assignmentBatchId) {
      throw new Error("assignmentBatchId is required when status is 'assigned'")
    }
    return {
      semesterId: params.semesterId,
      title: params.title,
      description: params.description,
      openDate: params.openDate,
      closeDate: params.closeDate,
      isActive: params.isActive ?? false,
      status: "assigned",
      scheduledFunctionId: params.scheduledFunctionId,
      assignmentBatchId: params.assignmentBatchId
    } as const
  }
  
  return {
    semesterId: params.semesterId,
    title: params.title,
    description: params.description,
    openDate: params.openDate,
    closeDate: params.closeDate,
    isActive: params.isActive ?? false,
    status: "open",
    scheduledFunctionId: params.scheduledFunctionId
  } as const
}

/**
 * Creates an open selection period.
 * 
 * @category Constructors
 * @since 0.1.0
 */
export const makeOpen = (params: {
  readonly semesterId: string
  readonly title: string
  readonly description: string
  readonly openDate: number
  readonly closeDate: number
  readonly isActive?: boolean
  readonly scheduledFunctionId?: Id<"_scheduled_functions">
}): SelectionPeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isActive: params.isActive ?? false,
  status: "open" as const,
  scheduledFunctionId: params.scheduledFunctionId
})

/**
 * Creates an assigned selection period.
 * 
 * @category Constructors
 * @since 0.1.0
 */
export const makeAssigned = (params: {
  readonly semesterId: string
  readonly title: string
  readonly description: string
  readonly openDate: number
  readonly closeDate: number
  readonly assignmentBatchId: string
  readonly isActive?: boolean
  readonly scheduledFunctionId?: Id<"_scheduled_functions">
}): SelectionPeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isActive: params.isActive ?? false,
  status: "assigned" as const,
  scheduledFunctionId: params.scheduledFunctionId,
  assignmentBatchId: params.assignmentBatchId
})

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
 * Marks a selection period as assigned.
 * 
 * @category Combinators
 * @since 0.1.0
 */
export const markAssigned = (batchId: string) => (period: SelectionPeriod): SelectionPeriod => ({
  semesterId: period.semesterId,
  title: period.title,
  description: period.description,
  openDate: period.openDate,
  closeDate: period.closeDate,
  isActive: period.isActive,
  status: "assigned" as const,
  scheduledFunctionId: period.scheduledFunctionId,
  assignmentBatchId: batchId
})

/**
 * Checks if a selection period has been assigned.
 * 
 * @category Predicates
 * @since 0.1.0
 */
export const isAssigned = (period: SelectionPeriod): boolean =>
  period.status === "assigned"

/**
 * Checks if a selection period is ready for assignment.
 * 
 * @category Predicates  
 * @since 0.1.0
 */
export const canAssign = (period: SelectionPeriod): boolean =>
  period.status === "open" && period.isActive

/**
 * Gets the status of a selection period.
 * 
 * @category Getters
 * @since 0.1.0
 */
export const getStatus = (now: number = Date.now()) => (
  period: SelectionPeriod
): "inactive" | "upcoming" | "open" | "closed" | "assigned" => {
  if (period.status === "assigned") return "assigned"
  if (!period.isActive) return "inactive"
  if (now < period.openDate) return "upcoming"
  if (now <= period.closeDate) return "open"
  return "closed"
}