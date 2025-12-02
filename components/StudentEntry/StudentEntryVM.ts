import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import * as Option from "effect/Option"

// ============================================================================
// CONSTANTS
// ============================================================================

const STUDENT_ID_LENGTH = 7
const DIGITS_ONLY = /^[0-9]+$/

// ============================================================================
// View Model Types
// ============================================================================

export interface DigitSlotVM {
  readonly key: string
  readonly index: number
}

export interface StudentEntryVM {
  /** The current input value - string of digits */
  readonly value$: ReadonlySignal<string>

  /** Whether all digits have been entered (length check) */
  readonly isComplete$: ReadonlySignal<boolean>

  /** Pre-computed array of digit slot display states */
  readonly digitSlots$: ReadonlySignal<readonly DigitSlotVM[]>

  /** Validation error message */
  readonly errorMessage$: ReadonlySignal<Option.Option<string>>

  /** Update the input value (validates digits only) */
  readonly setValue: (value: string) => void

  /** Handle digit input with validation */
  readonly handleDigitInput: (value: string) => void

  /** Handle backspace/delete action */
  readonly handleBackspace: () => void

  /** Handle completion (save and navigate) */
  readonly handleComplete: () => void
}

// ============================================================================
// Dependencies
// ============================================================================

export interface StudentEntryVMDeps {
  /** Callback to execute when student ID entry is complete */
  readonly onComplete: (studentId: string) => void
}

// ============================================================================
// Factory - creates the View Model
// ============================================================================

export function createStudentEntryVM(deps: StudentEntryVMDeps): StudentEntryVM {
  const { onComplete } = deps

  // State signals - created once in the factory
  const value$ = signal("")
  const errorMessage$ = signal<Option.Option<string>>(Option.none())

  // Computed: Check if entry is complete
  const isComplete$ = computed(() => {
    const value = value$.value
    return value.length === STUDENT_ID_LENGTH && DIGITS_ONLY.test(value)
  })

  // Computed: Pre-format digit slots for display
  const digitSlots$ = computed((): readonly DigitSlotVM[] => {
    return Array.from({ length: STUDENT_ID_LENGTH }).map((_, i) => ({
      key: `digit-${i}`,
      index: i,
    }))
  })

  // Action: Handle completion
  const handleComplete = (): void => {
    const currentValue = value$.value

    if (currentValue.length !== STUDENT_ID_LENGTH) {
      errorMessage$.value = Option.some(`Student ID must be exactly ${STUDENT_ID_LENGTH} digits`)
      return
    }

    if (!DIGITS_ONLY.test(currentValue)) {
      errorMessage$.value = Option.some("Only digits (0-9) are allowed")
      return
    }

    errorMessage$.value = Option.none()

    // Save to localStorage
    localStorage.setItem("studentId", currentValue)

    // Execute callback
    onComplete(currentValue)
  }

  // Action: Set value with digit-only validation
  const setValue = (newValue: string): void => {
    const digits = newValue.replace(/\D/g, "")

    if (digits.length > STUDENT_ID_LENGTH) {
      batch(() => {
        errorMessage$.value = Option.some(`Student ID must be exactly ${STUDENT_ID_LENGTH} digits`)
        value$.value = digits.slice(0, STUDENT_ID_LENGTH)
      })
    } else {
      batch(() => {
        errorMessage$.value = Option.none()
        value$.value = digits
      })
    }

    // Auto-complete when valid
    if (digits.length === STUDENT_ID_LENGTH && DIGITS_ONLY.test(digits)) {
      handleComplete()
    }
  }

  // Action: Handle digit input
  const handleDigitInput = (newValue: string): void => {
    // Validate that input contains only digits
    if (newValue && !DIGITS_ONLY.test(newValue)) {
      errorMessage$.value = Option.some("Only digits (0-9) are allowed")
      return
    }

    setValue(newValue)
  }

  // Action: Handle backspace
  const handleBackspace = (): void => {
    const currentValue = value$.value
    if (currentValue.length > 0) {
      batch(() => {
        value$.value = currentValue.slice(0, -1)
        errorMessage$.value = Option.none()
      })
    }
  }

  return {
    value$,
    isComplete$,
    digitSlots$,
    errorMessage$,
    setValue,
    handleDigitInput,
    handleBackspace,
    handleComplete,
  }
}
