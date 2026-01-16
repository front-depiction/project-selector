import { v } from "convex/values"
import type { Infer } from "convex/values"
import { Id } from "../_generated/dataModel"
import { dual } from "effect/Function"

/**
 * Base properties shared by all SelectionPeriod variants
 */
const BaseSelectionPeriod = {
  semesterId: v.string(),
  title: v.string(),
  description: v.string(),
  openDate: v.number(),
  closeDate: v.number(),
  isExperiment: v.optional(v.boolean()),
  excludePairs: v.optional(v.array(v.array(v.string()))),
}

/**
 * Inactive period - not yet opened
 */
export const InactivePeriod = v.object({
  ...BaseSelectionPeriod,
  kind: v.literal("inactive"),
  scheduledOpenFunctionId: v.optional(v.id("_scheduled_functions")),
})

/**
 * Open period - actively accepting selections with scheduled close
 */
export const OpenPeriod = v.object({
  ...BaseSelectionPeriod,
  kind: v.literal("open"),
  scheduledFunctionId: v.id("_scheduled_functions"),
})

/**
 * Closed period - no longer accepting selections, awaiting assignment
 */
export const ClosedPeriod = v.object({
  ...BaseSelectionPeriod,
  kind: v.literal("closed"),
})

/**
 * Assigned period - assignments have been made
 */
export const AssignedPeriod = v.object({
  ...BaseSelectionPeriod,
  kind: v.literal("assigned"),
  assignmentBatchId: v.string(),
})

/**
 * Convex validator for SelectionPeriod objects.
 *
 * @category Validators
 * @since 0.1.0
 */
export const SelectionPeriod = v.union(
  InactivePeriod,
  OpenPeriod,
  ClosedPeriod,
  AssignedPeriod
)

/**
 * SelectionPeriod type representing a selection time window.
 *
 * @category Types
 * @since 0.1.0
 */
export type SelectionPeriod = Readonly<Infer<typeof SelectionPeriod>>
export type InactivePeriod = Readonly<Infer<typeof InactivePeriod>>
export type OpenPeriod = Readonly<Infer<typeof OpenPeriod>>
export type ClosedPeriod = Readonly<Infer<typeof ClosedPeriod>>
export type AssignedPeriod = Readonly<Infer<typeof AssignedPeriod>>

/**
 * Creates an inactive SelectionPeriod.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * import * as SelectionPeriod from "./schemas/SelectionPeriod"
 *
 * const period = SelectionPeriod.makeInactive({
 *   semesterId: "2024-spring",
 *   title: "Spring 2024 Project Selection",
 *   description: "Choose your capstone project for the spring semester",
 *   openDate: new Date("2024-03-01").getTime(),
 *   closeDate: new Date("2024-03-15").getTime()
 * })
 */
export const makeInactive = (params: {
  readonly semesterId: string
  readonly title: string
  readonly description: string
  readonly openDate: number
  readonly closeDate: number
  readonly isExperiment?: boolean
  readonly excludePairs?: string[][]
  readonly scheduledOpenFunctionId?: Id<"_scheduled_functions">
}): InactivePeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isExperiment: params.isExperiment,
  excludePairs: params.excludePairs,
  kind: "inactive" as const,
  scheduledOpenFunctionId: params.scheduledOpenFunctionId,
})

/**
 * Creates an open SelectionPeriod.
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
  readonly isExperiment?: boolean
  readonly excludePairs?: string[][]
  readonly scheduledFunctionId: Id<"_scheduled_functions">
}): OpenPeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isExperiment: params.isExperiment,
  excludePairs: params.excludePairs,
  kind: "open" as const,
  scheduledFunctionId: params.scheduledFunctionId,
})

/**
 * Creates a closed SelectionPeriod.
 *
 * @category Constructors
 * @since 0.1.0
 */
export const makeClosed = (params: {
  readonly semesterId: string
  readonly title: string
  readonly description: string
  readonly openDate: number
  readonly closeDate: number
  readonly isExperiment?: boolean
  readonly excludePairs?: string[][]
}): ClosedPeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isExperiment: params.isExperiment,
  excludePairs: params.excludePairs,
  kind: "closed" as const,
})

/**
 * Creates an assigned SelectionPeriod.
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
  readonly isExperiment?: boolean
  readonly excludePairs?: string[][]
  readonly assignmentBatchId: string
}): AssignedPeriod => ({
  semesterId: params.semesterId,
  title: params.title,
  description: params.description,
  openDate: params.openDate,
  closeDate: params.closeDate,
  isExperiment: params.isExperiment,
  excludePairs: params.excludePairs,
  kind: "assigned" as const,
  assignmentBatchId: params.assignmentBatchId,
})

/**
 * Date comparison helpers
 *
 * @category Date Utilities
 * @since 0.1.0
 */
export const DateCompare = {
  isBefore: (date: number) => (reference: number) => date < reference,
  isAfter: (date: number) => (reference: number) => date > reference,
  isBetween: (date: number) => (start: number, end: number) => date >= start && date <= end,
  isBeforeOrEqual: (date: number) => (reference: number) => date <= reference,
  isAfterOrEqual: (date: number) => (reference: number) => date >= reference,
} as const

/**
 * Opens an inactive period with a scheduled close function.
 *
 * @category Combinators
 * @since 0.1.0
 */
export const open = (scheduledFunctionId: Id<"_scheduled_functions">) =>
  (period: InactivePeriod): OpenPeriod => ({
    ...period,
    kind: "open" as const,
    scheduledFunctionId,
  })

/**
 * Closes an open period.
 *
 * @category Combinators
 * @since 0.1.0
 */
export const close = (period: OpenPeriod): ClosedPeriod => ({
  semesterId: period.semesterId,
  title: period.title,
  description: period.description,
  openDate: period.openDate,
  closeDate: period.closeDate,
  kind: "closed" as const,
})

/**
 * Assigns a closed period.
 *
 * @category Combinators
 * @since 0.1.0
 */
export const assign = (assignmentBatchId: string) =>
  (period: ClosedPeriod): AssignedPeriod => ({
    semesterId: period.semesterId,
    title: period.title,
    description: period.description,
    openDate: period.openDate,
    closeDate: period.closeDate,
    kind: "assigned" as const,
    assignmentBatchId,
  })

/**
 * Type guards with narrowing
 *
 * @category Predicates
 * @since 0.1.0
 */
export const isInactive = <P extends SelectionPeriod>(period: P): period is Extract<P, InactivePeriod> =>
  period.kind === "inactive"


export const isOpen = <P extends SelectionPeriod>(period: P): period is Extract<P, OpenPeriod> =>
  period.kind === "open"

export const isClosed = <P extends SelectionPeriod>(period: P): period is Extract<P, ClosedPeriod> =>
  period.kind === "closed"

export const isAssigned = <P extends SelectionPeriod>(period: P): period is Extract<P, AssignedPeriod> =>
  period.kind === "assigned"

/**
 * Checks if period has a scheduled function.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const hasScheduledFunction = <P extends SelectionPeriod>(
  period: P
): period is Extract<P, OpenPeriod> =>
  period.kind === "open"

/**
 * Checks if period can be opened (is inactive and time is right).
 *
 * @category Predicates
 * @since 0.1.0
 */
export const canOpen = (now: number = Date.now()) =>
  <P extends SelectionPeriod>(period: P): period is Extract<P, InactivePeriod> =>
    isInactive(period) && DateCompare.isAfterOrEqual(now)(period.openDate)

/**
 * Checks if period can be closed (is open and time is right).
 *
 * @category Predicates
 * @since 0.1.0
 */
export const canClose = (now: number = Date.now()) =>
  <P extends SelectionPeriod>(period: P): period is Extract<P, OpenPeriod> =>
    isOpen(period) && DateCompare.isAfter(now)(period.closeDate)

/**
 * Checks if period can be assigned (is closed).
 *
 * @category Predicates
 * @since 0.1.0
 */
export const canAssign = <P extends SelectionPeriod>(period: P): period is Extract<P, ClosedPeriod> =>
  isClosed(period)

/**
 * Checks if period is within its active window.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const isWithinWindow = (now: number = Date.now()) => (period: SelectionPeriod): boolean =>
  DateCompare.isBetween(now)(period.openDate, period.closeDate)

/**
 * Checks if period window has not started.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const isBeforeWindow = (now: number = Date.now()) => (period: SelectionPeriod): boolean =>
  DateCompare.isBefore(now)(period.openDate)

/**
 * Checks if period window has ended.
 *
 * @category Predicates
 * @since 0.1.0
 */
export const isAfterWindow = (now: number = Date.now()) => (period: SelectionPeriod): boolean =>
  DateCompare.isAfter(now)(period.closeDate)

/**
 * Pattern matching helper for ADT.
 *
 * @category Pattern Matching
 * @since 0.1.0
 * @example
 * import * as SelectionPeriod from "./schemas/SelectionPeriod"
 *
 * const result = SelectionPeriod.match(period)({
 *   inactive: () => "Not yet scheduled",
 *   scheduled: (p) => `Opens at ${new Date(p.openDate)}",
 *   open: () => "Accepting selections",
 *   closed: () => "Selection period ended",
 *   assigned: (p) => `Assigned in batch ${p.assignmentBatchId}`
 * })
 */
export const match = <P extends SelectionPeriod>(period: P) =>
  <R>(patterns: {
    inactive: (p: Extract<P, InactivePeriod>) => R
    open: (p: Extract<P, OpenPeriod>) => R
    closed: (p: Extract<P, ClosedPeriod>) => R
    assigned: (p: Extract<P, AssignedPeriod>) => R
  }): R => {
    switch (period.kind) {
      case "inactive": return patterns.inactive(period as Extract<P, InactivePeriod>)
      case "open": return patterns.open(period as Extract<P, OpenPeriod>)
      case "closed": return patterns.closed(period as Extract<P, ClosedPeriod>)
      case "assigned": return patterns.assigned(period as Extract<P, AssignedPeriod>)
    }
  }

/**
 * Pattern matching for optional SelectionPeriod (handles undefined/null).
 *
 * @category Pattern Matching
 * @since 0.1.0
 * @example
 * import * as SelectionPeriod from "./schemas/SelectionPeriod"
 *
 * const result = SelectionPeriod.matchOptional(period)({
 *   inactive: () => "Not yet scheduled",
 *   open: () => "Accepting selections",
 *   closed: () => "Selection period ended",
 *   assigned: (p) => `Assigned in batch ${p.assignmentBatchId}`,
 *   none: () => "No active period"
 * })
 */
export const matchOptional = <P extends SelectionPeriod>(period: P | undefined | null) =>
  <R>(patterns: {
    inactive: (p: Extract<P, InactivePeriod>) => R
    open: (p: Extract<P, OpenPeriod>) => R
    closed: (p: Extract<P, ClosedPeriod>) => R
    assigned: (p: Extract<P, AssignedPeriod>) => R
    none: () => R
  }): R => period ? match(period)(patterns) : patterns.none()

/**
 * Partial pattern matching with default.
 *
 * @category Pattern Matching
 * @since 0.1.0
 */
export const matchPartial = <P extends SelectionPeriod>(period: P) =>
  <R>(patterns: Partial<{
    inactive: (p: Extract<P, InactivePeriod>) => R
    open: (p: Extract<P, OpenPeriod>) => R
    closed: (p: Extract<P, ClosedPeriod>) => R
    assigned: (p: Extract<P, AssignedPeriod>) => R
  }>, defaultCase: (p: P) => R): R => {
    const handler = patterns[period.kind as keyof typeof patterns]
    return handler ? (handler as any)(period) : defaultCase(period)
  }

/**
 * Fold over the ADT structure.
 *
 * @category Pattern Matching
 * @since 0.1.0
 */
export const fold = <R>(cases: {
  inactive: (p: InactivePeriod) => R
  open: (p: OpenPeriod) => R
  closed: (p: ClosedPeriod) => R
  assigned: (p: AssignedPeriod) => R
}) => (period: SelectionPeriod): R => match(period)(cases)

/**
 * Get human-readable status.
 *
 * @category Getters
 * @since 0.1.0
 */
export const getStatus = (now: number = Date.now()) =>
  (period: SelectionPeriod): string =>
    match(period)({
      inactive: (p) => DateCompare.isBefore(now)(p.openDate) ? "Upcoming" : "Ready to open",
      open: (p) => DateCompare.isBetween(now)(p.openDate, p.closeDate) ? "Open" : "Overdue for closing",
      closed: () => "Closed",
      assigned: () => "Assigned"
    })

/**
 * State transition helper.
 *
 * @category Combinators
 * @since 0.1.0
 */
export const transition = (now: number = Date.now(), scheduledFunctionId?: Id<"_scheduled_functions">) =>
  (period: SelectionPeriod): SelectionPeriod =>
    matchPartial(period)({
      inactive: p => canOpen(now)(p) && scheduledFunctionId ? open(scheduledFunctionId)(p) : p,
      open: p => canClose(now)(p) ? close(p) : p,
    }, p => p)

/**
 * Chain state transitions based on time.
 *
 * @category Combinators
 * @since 0.1.0
 */
export const advanceToCurrentState = (now: number = Date.now(), scheduledFunctionId?: Id<"_scheduled_functions">) =>
  (period: SelectionPeriod): Promise<SelectionPeriod> =>
    Promise.resolve(period)
      .then(p => isInactive(p) && canOpen(now)(p) && scheduledFunctionId ? open(scheduledFunctionId)(p) : p)
      .then(p => isOpen(p) && canClose(now)(p) ? close(p) : p)

/**
 * Array refinement helpers for filtering collections of SelectionPeriods.
 *
 * @category Array Refinements
 * @since 0.1.0
 */

/**
 * Filters an array to only include inactive periods.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const inactivePeriods = getInactives(allPeriods)
 */
export const getInactives = <P extends SelectionPeriod>(periods: readonly P[]): Extract<P, InactivePeriod>[] =>
  periods.filter(isInactive)

/**
 * Filters an array to only include open periods.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const openPeriods = getOpens(allPeriods)
 */
export const getOpens = <P extends SelectionPeriod>(periods: readonly P[]): Extract<P, OpenPeriod>[] =>
  periods.filter(isOpen)

/**
 * Filters an array to only include closed periods.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const closedPeriods = getCloseds(allPeriods)
 */
export const getCloseds = <P extends SelectionPeriod>(periods: readonly P[]): Extract<P, ClosedPeriod>[] =>
  periods.filter(isClosed)

/**
 * Filters an array to only include assigned periods.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const assignedPeriods = getAssigneds(allPeriods)
 */
export const getAssigneds = <P extends SelectionPeriod>(periods: readonly P[]): Extract<P, AssignedPeriod>[] =>
  periods.filter(isAssigned)

/**
 * Filters an array to only include periods with scheduled functions.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const scheduled = getWithScheduledFunctions(allPeriods)
 */
export const getWithScheduledFunctions = <P extends SelectionPeriod>(periods: readonly P[]): Extract<P, OpenPeriod>[] =>
  periods.filter(hasScheduledFunction) as Extract<P, OpenPeriod>[]

/**
 * Filters periods that are deactivatable (have scheduled function but not assigned).
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const toDeactivate = getDeactivatable(allPeriods)
 */
export const getDeactivatable = <P extends SelectionPeriod>(periods: readonly P[]): Extract<P, OpenPeriod>[] =>
  periods.filter(p => hasScheduledFunction(p) && !isAssigned(p)) as Extract<P, OpenPeriod>[]

/**
 * Finds the first active period (open and within window).
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const active = findActive(allPeriods)
 */
export const findActive = (now: number = Date.now()) =>
  (periods: readonly SelectionPeriod[]): OpenPeriod | undefined =>
    periods.find(p => isOpen(p) && isWithinWindow(now)(p)) as OpenPeriod | undefined

/**
 * Gets the most recent assigned period.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const recent = getMostRecentAssigned(allPeriods)
 */
export const getMostRecentAssigned = <P extends SelectionPeriod>(
  periods: readonly P[]
): Extract<P, AssignedPeriod> | undefined => {
  const assigned = getAssigneds(periods)
  return assigned.length === 0
    ? undefined
    : assigned.reduce((a, b) => a.closeDate > b.closeDate ? a : b)
}

/**
 * Sorts periods by close date (descending).
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const sorted = sortByCloseDateDesc(allPeriods)
 */
export const sortByCloseDateDesc = <P extends SelectionPeriod>(periods: readonly P[]): P[] =>
  [...periods].sort((a, b) => b.closeDate - a.closeDate)

/**
 * Sorts periods by open date (ascending).
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const sorted = sortByOpenDateAsc(allPeriods)
 */
export const sortByOpenDateAsc = <P extends SelectionPeriod>(periods: readonly P[]): P[] =>
  [...periods].sort((a, b) => a.openDate - b.openDate)

/**
 * Filters periods by semester.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const springPeriods = filterBySemester("2024-spring")(allPeriods)
 */
export const filterBySemester = (semesterId: string) =>
  <P extends SelectionPeriod>(periods: readonly P[]): P[] =>
    periods.filter(p => p.semesterId === semesterId)

/**
 * Groups periods by semester.
 *
 * @category Array Refinements
 * @since 0.1.0
 * @example
 * const grouped = groupBySemester(allPeriods)
 */
export const groupBySemester = <P extends SelectionPeriod>(
  periods: readonly P[]
): ReadonlyMap<string, readonly P[]> => {
  const map = new Map<string, P[]>()
  for (const period of periods) {
    const existing = map.get(period.semesterId) || []
    map.set(period.semesterId, [...existing, period])
  }
  return map
}

/**
 * Composable period transformations using Effect dual.
 *
 * @category Transformations
 * @since 0.1.0
 */


/**
 * Replaces a period with a new inactive period having the same base properties.
 *
 * @category Transformations
 * @since 0.1.0
 * @example
 * pipe(openPeriod, toInactive)
 */
export const toInactive = <P extends SelectionPeriod>(period: P): InactivePeriod =>
  makeInactive(getBase(period))

/**
 * Opens a period with a scheduled function (only works on inactive periods).
 *
 * @category Transformations
 * @since 0.1.0
 * @example
 * pipe(inactivePeriod, p => toOpen(p, scheduledId))
 */
export const toOpen = dual<
  (scheduledFunctionId: Id<"_scheduled_functions">) => (period: InactivePeriod) => OpenPeriod,
  (period: InactivePeriod, scheduledFunctionId: Id<"_scheduled_functions">) => OpenPeriod
>(2, (period, scheduledFunctionId) =>
  makeOpen({ ...getBase(period), scheduledFunctionId })
)

/**
 * Closes an open period.
 *
 * @category Transformations
 * @since 0.1.0
 * @example
 * pipe(openPeriod, toClosed)
 */
export const toClosed = (period: OpenPeriod): ClosedPeriod =>
  makeClosed(getBase(period))

/**
 * Assigns a closed period with a batch ID.
 *
 * @category Transformations
 * @since 0.1.0
 * @example
 * pipe(closedPeriod, p => toAssigned(p, "batch-123"))
 */
export const toAssigned = dual<
  (assignmentBatchId: string) => (period: ClosedPeriod) => AssignedPeriod,
  (period: ClosedPeriod, assignmentBatchId: string) => AssignedPeriod
>(2, (period, assignmentBatchId) =>
  makeAssigned({ ...getBase(period), assignmentBatchId })
)


/**
 * Extracts base properties from any period.
 *
 * @category Getters
 * @since 0.1.0
 * @example
 * const base = getBase(period)
 */
export const getBase = (period: SelectionPeriod) => ({
  semesterId: period.semesterId,
  title: period.title,
  description: period.description,
  openDate: period.openDate,
  closeDate: period.closeDate
})

/**
 * Creates a period from base properties with optional state.
 *
 * @category Constructors
 * @since 0.1.0
 * @example
 * const period = fromBase(base, { kind: "open", scheduledFunctionId })
 */
export const fromBase = (
  base: ReturnType<typeof getBase>,
  state?: { kind: "open", scheduledFunctionId: Id<"_scheduled_functions"> } |
  { kind: "closed" } |
  { kind: "assigned", assignmentBatchId: string }
): SelectionPeriod => {
  if (!state) return makeInactive(base)
  switch (state.kind) {
    case "open": return makeOpen({ ...base, scheduledFunctionId: state.scheduledFunctionId })
    case "closed": return makeClosed(base)
    case "assigned": return makeAssigned({ ...base, assignmentBatchId: state.assignmentBatchId })
  }
}

/**
 * Updates base properties while preserving state.
 *
 * @category Transformations
 * @since 0.1.0
 * @example
 * const updated = withBase(period, newBase)
 */
export const withBase = dual<
  (base: ReturnType<typeof getBase>) => (period: SelectionPeriod) => SelectionPeriod,
  (period: SelectionPeriod, base: ReturnType<typeof getBase>) => SelectionPeriod
>(2, (period, base): SelectionPeriod => {
  switch (period.kind) {
    case "inactive": return makeInactive(base)
    case "open": return makeOpen({ ...base, scheduledFunctionId: period.scheduledFunctionId })
    case "closed": return makeClosed(base)
    case "assigned": return makeAssigned({ ...base, assignmentBatchId: period.assignmentBatchId })
  }
})

/**
 * Checks if a period needs rescheduling based on close date change.
 *
 * @category Predicates
 * @since 0.1.0
 * @example
 * pipe(period, needsReschedule(newCloseDate))
 */
export const needsReschedule = dual<
  (newCloseDate: number) => (period: SelectionPeriod) => boolean,
  (period: SelectionPeriod, newCloseDate: number) => boolean
>(2, (period, newCloseDate) => period.closeDate !== newCloseDate)

/**
 * Gets the scheduled function ID if present.
 *
 * @category Getters
 * @since 0.1.0
 * @example
 * const scheduledId = getScheduledFunctionId(period)
 */
export const getScheduledFunctionId = (period: SelectionPeriod): Id<"_scheduled_functions"> | undefined =>
  hasScheduledFunction(period) ? period.scheduledFunctionId : undefined

/**
 * Gets the assignment batch ID if present.
 *
 * @category Getters
 * @since 0.1.0
 * @example
 * const batchId = getAssignmentBatchId(period)
 */
export const getAssignmentBatchId = (period: SelectionPeriod): string | undefined =>
  isAssigned(period) ? period.assignmentBatchId : undefined