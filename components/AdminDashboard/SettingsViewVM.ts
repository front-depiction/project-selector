"use client"
import { signal, ReadonlySignal } from "@preact/signals-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

// ============================================================================
// View Model Types
// ============================================================================

export interface DialogVM {
  readonly isOpen$: ReadonlySignal<boolean>
  readonly open: () => void
  readonly close: () => void
}

export interface SettingsViewVM {
  readonly clearDialog: DialogVM
  readonly isSeedingData$: ReadonlySignal<boolean>
  readonly isClearingData$: ReadonlySignal<boolean>
  readonly seedTestData: () => void
  readonly clearAllData: () => void
  readonly confirmClear: () => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useSettingsViewVM(): SettingsViewVM {
  // Convex mutations
  const seedTestDataMutation = useMutation(api.admin.seedTestData)
  const clearAllDataMutation = useMutation(api.admin.clearAllData)

  // Local reactive state
  const clearDialogOpen$ = signal(false)
  const isSeedingData$ = signal(false)
  const isClearingData$ = signal(false)

  // Dialog VM
  const clearDialog: DialogVM = {
    isOpen$: clearDialogOpen$,
    open: () => {
      clearDialogOpen$.value = true
    },
    close: () => {
      clearDialogOpen$.value = false
    },
  }

  // Actions
  const seedTestData = (): void => {
    isSeedingData$.value = true
    seedTestDataMutation({})
      .then(() => {
        isSeedingData$.value = false
      })
      .catch((error) => {
        console.error("Failed to seed test data:", error)
        isSeedingData$.value = false
      })
  }

  const clearAllData = (): void => {
    // Just open the confirmation dialog
    clearDialog.open()
  }

  const confirmClear = (): void => {
    isClearingData$.value = true
    clearAllDataMutation({})
      .then(() => {
        isClearingData$.value = false
        clearDialog.close()
      })
      .catch((error) => {
        console.error("Failed to clear all data:", error)
        isClearingData$.value = false
      })
  }

  return {
    clearDialog,
    isSeedingData$,
    isClearingData$,
    seedTestData,
    clearAllData,
    confirmClear,
  }
}
