"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"

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
  readonly errorMessage$: ReadonlySignal<string | null>

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
// Hook - creates the View Model
// ============================================================================

export interface StudentEntryVMOptions {
  /** Callback to execute when student ID entry is complete */
  readonly onComplete: (studentId: string) => void
}

export function useStudentEntryVM(options: StudentEntryVMOptions): StudentEntryVM {
  const { onComplete } = options

  // State signals
  const value$ = signal("")
  const errorMessage$ = signal<string | null>(null)

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

  // Action: Set value with digit-only validation
  const setValue = (newValue: string): void => {
    const digits = newValue.replace(/\D/g, "")

    if (digits.length > STUDENT_ID_LENGTH) {
      errorMessage$.value = `Student ID must be exactly ${STUDENT_ID_LENGTH} digits`
      value$.value = digits.slice(0, STUDENT_ID_LENGTH)
    } else {
      errorMessage$.value = null
      value$.value = digits
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
      errorMessage$.value = "Only digits (0-9) are allowed"
      return
    }

    setValue(newValue)
  }

  // Action: Handle backspace
  const handleBackspace = (): void => {
    const currentValue = value$.value
    if (currentValue.length > 0) {
      value$.value = currentValue.slice(0, -1)
      errorMessage$.value = null
    }
  }

  // Action: Handle completion
  const handleComplete = (): void => {
    const currentValue = value$.value

    if (currentValue.length !== STUDENT_ID_LENGTH) {
      errorMessage$.value = `Student ID must be exactly ${STUDENT_ID_LENGTH} digits`
      return
    }

    if (!DIGITS_ONLY.test(currentValue)) {
      errorMessage$.value = "Only digits (0-9) are allowed"
      return
    }

    errorMessage$.value = null

    // Save to localStorage
    localStorage.setItem("studentId", currentValue)

    // Execute callback
    onComplete(currentValue)
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
