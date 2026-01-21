import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import * as Option from "effect/Option"
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
}

export interface PeriodJoinPageVM {
  // State
  /** Period information loaded from the shareable link */
  readonly periodInfo$: ReadonlySignal<Option.Option<PeriodInfo>>

  /** Whether the period data is still loading */
  readonly isLoading$: ReadonlySignal<boolean>

  /** Error message if period loading failed */
  readonly error$: ReadonlySignal<Option.Option<string>>

  /** Current access code input value */
  readonly accessCode$: ReadonlySignal<string>

  /** Whether the access code is being validated */
  readonly isValidating$: ReadonlySignal<boolean>

  /** Validation error for the access code */
  readonly codeError$: ReadonlySignal<Option.Option<string>>

  // Actions
  /** Update the access code input value */
  readonly setAccessCode: (code: string) => void

  /** Submit the access code for validation */
  readonly submitCode: () => Promise<void>
}

// ============================================================================
// Dependencies
// ============================================================================

export interface PeriodJoinPageVMDeps {
  /** Signal of period data from Convex (null = not found, undefined = loading) */
  readonly periodData$: ReadonlySignal<PeriodInfo | null | undefined>

  /** Async function to validate the access code against the period */
  readonly validateAccessCode: (args: {
    code: string
    periodId: Id<"selectionPeriods">
  }) => Promise<{ valid: boolean; error?: string }>

  /** Callback to execute when access code validation succeeds */
  readonly onSuccess: (accessCode: string) => void
}

// ============================================================================
// Factory Function - creates the View Model
// ============================================================================

export function createPeriodJoinPageVM(deps: PeriodJoinPageVMDeps): PeriodJoinPageVM {
  const { periodData$, validateAccessCode, onSuccess } = deps

  // State signals - created once in the factory
  const accessCode$ = signal("")
  const isValidating$ = signal(false)
  const codeError$ = signal<Option.Option<string>>(Option.none())

  // Computed: Transform periodData to Option type
  const periodInfo$ = computed((): Option.Option<PeriodInfo> => {
    const data = periodData$.value
    // undefined = loading, null = not found, object = found
    if (data === undefined || data === null) {
      return Option.none()
    }
    return Option.some(data)
  })

  // Computed: Loading state (undefined means still loading)
  const isLoading$ = computed((): boolean => {
    return periodData$.value === undefined
  })

  // Computed: Error state (null means not found)
  const error$ = computed((): Option.Option<string> => {
    const data = periodData$.value
    // Only show error when loading is complete (not undefined) and data is null
    if (data === null) {
      return Option.some("Selection period not found or is no longer available")
    }
    return Option.none()
  })

  // Action: Set access code with alphanumeric validation
  const setAccessCode = (newValue: string): void => {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = newValue.replace(/[^A-Za-z0-9]/g, "").toUpperCase()

    if (cleaned.length > ACCESS_CODE_LENGTH) {
      batch(() => {
        codeError$.value = Option.some(
          `Access code must be exactly ${ACCESS_CODE_LENGTH} characters`
        )
        accessCode$.value = cleaned.slice(0, ACCESS_CODE_LENGTH)
      })
    } else {
      batch(() => {
        codeError$.value = Option.none()
        accessCode$.value = cleaned
      })
    }

    // Auto-submit when valid length is reached
    if (cleaned.length === ACCESS_CODE_LENGTH && ALPHANUMERIC.test(cleaned)) {
      submitCode()
    }
  }

  // Action: Submit access code for validation
  const submitCode = async (): Promise<void> => {
    const currentCode = accessCode$.value.toUpperCase()
    const periodInfo = periodInfo$.value

    // Validate code length
    if (currentCode.length !== ACCESS_CODE_LENGTH) {
      codeError$.value = Option.some(
        `Access code must be exactly ${ACCESS_CODE_LENGTH} characters`
      )
      return
    }

    // Validate alphanumeric
    if (!ALPHANUMERIC.test(currentCode)) {
      codeError$.value = Option.some("Only letters and numbers are allowed")
      return
    }

    // Ensure period info is available
    if (Option.isNone(periodInfo)) {
      codeError$.value = Option.some("Period information not available")
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
