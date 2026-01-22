import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import * as Option from "effect/Option"
import { format } from "date-fns"
import type { Id } from "@/convex/_generated/dataModel"

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCESS_CODE_LENGTH = 6
const ALPHANUMERIC = /^[A-Z0-9]+$/i

// ============================================================================
// View Model Types
// ============================================================================

export interface PeriodInfo {
  readonly _id: Id<"selectionPeriods">
  readonly title: string
  readonly description: string
  readonly shareableSlug: string
  readonly accessMode: "code" | "student_id"
  readonly codeLength: number
}

/** Response type from getPeriodBySlugWithStatus query */
export type PeriodStatusResponse =
  | { status: "open"; period: PeriodInfo }
  | { status: "not_found" }
  | { status: "inactive"; title: string; openDate: number }
  | { status: "closed"; title: string; closeDate: number }
  | { status: "assigned"; title: string }

/** Error type for display in UI */
export type PeriodErrorType = "not_found" | "inactive" | "closed" | "assigned"

export interface PeriodError {
  readonly type: PeriodErrorType
  readonly message: string
}

export interface PeriodJoinPageVM {
  // State
  /** Period information loaded from the shareable link */
  readonly periodInfo$: ReadonlySignal<Option.Option<PeriodInfo>>

  /** Whether the period data is still loading */
  readonly isLoading$: ReadonlySignal<boolean>

  /** Error with type and message if period is not joinable */
  readonly error$: ReadonlySignal<Option.Option<PeriodError>>

  /** Current access code input value */
  readonly accessCode$: ReadonlySignal<string>

  /** Whether the access code is being validated */
  readonly isValidating$: ReadonlySignal<boolean>

  /** Validation error for the access code */
  readonly codeError$: ReadonlySignal<Option.Option<string>>

  // Actions
  /** Update the access code input value. Pass accessMode to ensure correct behavior. */
  readonly setAccessCode: (code: string, accessMode?: "code" | "student_id") => void

  /** Submit the access code for validation */
  readonly submitCode: () => Promise<void>
}

// ============================================================================
// Dependencies
// ============================================================================

export interface PeriodJoinPageVMDeps {
  /** Signal of period status response from Convex (undefined = loading) */
  readonly periodStatusData$: ReadonlySignal<PeriodStatusResponse | undefined>

  /** Async function to validate the access code against the period */
  readonly validateAccessCode: (args: {
    code: string
    periodId: Id<"selectionPeriods">
  }) => Promise<{ valid: boolean; error?: string }>

  /** Callback to execute when access code validation succeeds */
  readonly onSuccess: (accessCode: string) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateForMessage(timestamp: number): string {
  return format(new Date(timestamp), "MMMM d, yyyy 'at' h:mm a")
}

function createErrorFromStatus(data: PeriodStatusResponse): Option.Option<PeriodError> {
  switch (data.status) {
    case "open":
      return Option.none()
    case "not_found":
      return Option.some({
        type: "not_found" as const,
        message: "Selection period not found.",
      })
    case "inactive":
      return Option.some({
        type: "inactive" as const,
        message: `This selection period hasn't opened yet. It will be available on ${formatDateForMessage(data.openDate)}.`,
      })
    case "closed":
      return Option.some({
        type: "closed" as const,
        message: `This selection period has closed. Submissions ended on ${formatDateForMessage(data.closeDate)}.`,
      })
    case "assigned":
      return Option.some({
        type: "assigned" as const,
        message: "Assignments have already been made for this selection period.",
      })
  }
}

// ============================================================================
// Factory Function - creates the View Model
// ============================================================================

export function createPeriodJoinPageVM(deps: PeriodJoinPageVMDeps): PeriodJoinPageVM {
  const { periodStatusData$, validateAccessCode, onSuccess } = deps

  // State signals - created once in the factory
  const accessCode$ = signal("")
  const isValidating$ = signal(false)
  const codeError$ = signal<Option.Option<string>>(Option.none())

  // Computed: Transform periodStatusData to Option<PeriodInfo> when status is "open"
  const periodInfo$ = computed((): Option.Option<PeriodInfo> => {
    const data = periodStatusData$.value
    // undefined = loading
    if (data === undefined) {
      return Option.none()
    }
    // Only return period info if status is "open"
    if (data.status === "open") {
      return Option.some(data.period)
    }
    return Option.none()
  })

  // Computed: Loading state (undefined means still loading)
  const isLoading$ = computed((): boolean => {
    return periodStatusData$.value === undefined
  })

  // Computed: Error state with type and specific message
  const error$ = computed((): Option.Option<PeriodError> => {
    const data = periodStatusData$.value
    // Still loading - no error yet
    if (data === undefined) {
      return Option.none()
    }
    return createErrorFromStatus(data)
  })

  // Action: Set access code with alphanumeric validation
  const setAccessCode = (newValue: string, explicitAccessMode?: "code" | "student_id"): void => {
    const periodInfo = periodInfo$.value
    // Use explicit access mode if provided, otherwise derive from period info
    const accessMode = explicitAccessMode ?? (Option.isSome(periodInfo) ? periodInfo.value.accessMode : "code")
    // Use dynamic code length from period info, fallback to default
    const codeLength = Option.isSome(periodInfo) ? periodInfo.value.codeLength : ACCESS_CODE_LENGTH

    // For student_id mode, accept any input without length restrictions
    if (accessMode === "student_id") {
      batch(() => {
        codeError$.value = Option.none()
        accessCode$.value = newValue.toUpperCase()
      })
      return
    }

    // Code mode: Remove non-alphanumeric characters and convert to uppercase
    const cleaned = newValue.replace(/[^A-Za-z0-9]/g, "").toUpperCase()

    if (cleaned.length > codeLength) {
      batch(() => {
        codeError$.value = Option.some(
          `Access code must be exactly ${codeLength} characters`
        )
        accessCode$.value = cleaned.slice(0, codeLength)
      })
    } else {
      batch(() => {
        codeError$.value = Option.none()
        accessCode$.value = cleaned
      })
    }

    // Auto-submit when valid length is reached (code mode only)
    if (cleaned.length === codeLength && ALPHANUMERIC.test(cleaned)) {
      submitCode()
    }
  }

  // Action: Submit access code for validation
  const submitCode = async (): Promise<void> => {
    const currentCode = accessCode$.value.toUpperCase()
    const periodInfo = periodInfo$.value

    // Ensure period info is available
    if (Option.isNone(periodInfo)) {
      codeError$.value = Option.some("Period information not available")
      return
    }

    const accessMode = periodInfo.value.accessMode
    const codeLength = periodInfo.value.codeLength

    // For student_id mode, just validate non-empty and save
    if (accessMode === "student_id") {
      if (currentCode.length === 0) {
        codeError$.value = Option.some("Please enter your student ID")
        return
      }

      // Save to localStorage
      localStorage.setItem("studentId", currentCode)

      // Execute success callback
      onSuccess(currentCode)
      return
    }

    // Code mode validation
    // Validate code length
    if (currentCode.length !== codeLength) {
      codeError$.value = Option.some(
        `Access code must be exactly ${codeLength} characters`
      )
      return
    }

    // Validate alphanumeric
    if (!ALPHANUMERIC.test(currentCode)) {
      codeError$.value = Option.some("Only letters and numbers are allowed")
      return
    }

    // Start validation
    isValidating$.value = true
    codeError$.value = Option.none()

    try {
      const result = await validateAccessCode({
        code: currentCode,
        periodId: periodInfo.value._id,
      })

      if (!result.valid) {
        codeError$.value = Option.some(result.error ?? "Invalid access code")
        return
      }

      // Save to localStorage (uppercase normalized)
      localStorage.setItem("studentId", currentCode)

      // Execute success callback
      onSuccess(currentCode)
    } catch (err) {
      console.error("Validation failed", err)
      codeError$.value = Option.some("Failed to validate code. Please try again.")
    } finally {
      isValidating$.value = false
    }
  }

  return {
    // State
    periodInfo$,
    isLoading$,
    error$,
    accessCode$,
    isValidating$,
    codeError$,

    // Actions
    setAccessCode,
    submitCode,
  }
}
