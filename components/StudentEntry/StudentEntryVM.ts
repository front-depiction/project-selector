import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import * as Option from "effect/Option"

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCESS_CODE_LENGTH = 6
const ALPHANUMERIC = /^[A-Z0-9]+$/i

// ============================================================================
// View Model Types
// ============================================================================

export interface CharSlotVM {
  readonly key: string
  readonly index: number
}

export interface StudentEntryVM {
  /** The current input value - string of alphanumeric characters */
  readonly value$: ReadonlySignal<string>

  /** Whether all characters have been entered (length check) */
  readonly isComplete$: ReadonlySignal<boolean>

  /** Pre-computed array of character slot display states */
  readonly charSlots$: ReadonlySignal<readonly CharSlotVM[]>

  /** Validation error message */
  readonly errorMessage$: ReadonlySignal<Option.Option<string>>

  /** Update the input value (validates alphanumeric only) */
  readonly setValue: (value: string) => void

  /** Handle character input with validation */
  readonly handleCharInput: (value: string) => void

  /** Handle backspace/delete action */
  readonly handleBackspace: () => void

  /** Handle completion (save and navigate) */
  readonly handleComplete: () => void

  // Legacy aliases for compatibility
  readonly digitSlots$: ReadonlySignal<readonly CharSlotVM[]>
  readonly handleDigitInput: (value: string) => void
}

// ============================================================================
// Dependencies
// ============================================================================

export interface StudentEntryVMDeps {
  /** Callback to execute when access code entry is complete */
  readonly onComplete: (accessCode: string) => void
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
    const value = value$.value.toUpperCase()
    return value.length === ACCESS_CODE_LENGTH && ALPHANUMERIC.test(value)
  })

  // Computed: Pre-format character slots for display
  const charSlots$ = computed((): readonly CharSlotVM[] => {
    return Array.from({ length: ACCESS_CODE_LENGTH }).map((_, i) => ({
      key: `char-${i}`,
      index: i,
    }))
  })

  // Action: Handle completion
  const handleComplete = (): void => {
    const currentValue = value$.value.toUpperCase()

    if (currentValue.length !== ACCESS_CODE_LENGTH) {
      errorMessage$.value = Option.some(`Access code must be exactly ${ACCESS_CODE_LENGTH} characters`)
      return
    }

    if (!ALPHANUMERIC.test(currentValue)) {
      errorMessage$.value = Option.some("Only letters and numbers are allowed")
      return
    }

    errorMessage$.value = Option.none()

    // Save to localStorage (uppercase normalized)
    localStorage.setItem("studentId", currentValue)

    // Execute callback
    onComplete(currentValue)
  }

  // Action: Set value with alphanumeric validation
  const setValue = (newValue: string): void => {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = newValue.replace(/[^A-Za-z0-9]/g, "").toUpperCase()

    if (cleaned.length > ACCESS_CODE_LENGTH) {
      batch(() => {
        errorMessage$.value = Option.some(`Access code must be exactly ${ACCESS_CODE_LENGTH} characters`)
        value$.value = cleaned.slice(0, ACCESS_CODE_LENGTH)
      })
    } else {
      batch(() => {
        errorMessage$.value = Option.none()
        value$.value = cleaned
      })
    }

    // Auto-complete when valid
    if (cleaned.length === ACCESS_CODE_LENGTH && ALPHANUMERIC.test(cleaned)) {
      handleComplete()
    }
  }

  // Action: Handle character input
  const handleCharInput = (newValue: string): void => {
    // Validate that input contains only alphanumeric characters
    if (newValue && !ALPHANUMERIC.test(newValue)) {
      errorMessage$.value = Option.some("Only letters and numbers are allowed")
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
    charSlots$,
    errorMessage$,
    setValue,
    handleCharInput,
    handleBackspace,
    handleComplete,
    // Legacy aliases
    digitSlots$: charSlots$,
    handleDigitInput: handleCharInput,
  }
}
