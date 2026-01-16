import { signal, ReadonlySignal } from "@preact/signals-react"
import type { Id } from "@/convex/_generated/dataModel"

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
  readonly isSettingUpExperiment$: ReadonlySignal<boolean>
  readonly isGeneratingAnswers$: ReadonlySignal<boolean>
  readonly experimentMapping$: ReadonlySignal<Array<{ name: string; accessCode: string; originalTeam: number }> | null>
  readonly experimentPeriodId$: ReadonlySignal<Id<"selectionPeriods"> | null>
  readonly seedTestData: () => void
  readonly clearAllData: () => void
  readonly confirmClear: () => void
  readonly setupExperiment: () => void
  readonly generateRandomAnswers: () => void
}

// ============================================================================
// Dependencies
// ============================================================================

export interface SettingsViewVMDeps {
  readonly seedTestDataMutation: (args: {}) => Promise<any>
  readonly clearAllDataMutation: (args: {}) => Promise<any>
  readonly setupExperimentMutation: (args: {}) => Promise<any>
  readonly generateRandomAnswersMutation: (args: { periodId: Id<"selectionPeriods"> }) => Promise<any>
}

// ============================================================================
// Factory - creates stable VM object with signals
// ============================================================================

export function createSettingsViewVM(deps: SettingsViewVMDeps): SettingsViewVM {
  const { seedTestDataMutation, clearAllDataMutation, setupExperimentMutation, generateRandomAnswersMutation } = deps

  // Create signals once
  const clearDialogOpen$ = signal(false)
  const isSeedingData$ = signal(false)
  const isClearingData$ = signal(false)
  const isSettingUpExperiment$ = signal(false)
  const isGeneratingAnswers$ = signal(false)
  const experimentMapping$ = signal<Array<{ name: string; accessCode: string; originalTeam: number }> | null>(null)
  const experimentPeriodId$ = signal<Id<"selectionPeriods"> | null>(null)

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

  const setupExperiment = (): void => {
    isSettingUpExperiment$.value = true
    experimentMapping$.value = null
    experimentPeriodId$.value = null
    setupExperimentMutation({})
      .then((result) => {
        isSettingUpExperiment$.value = false
        experimentMapping$.value = result.mapping
        experimentPeriodId$.value = result.periodId
      })
      .catch((error) => {
        console.error("Failed to setup experiment:", error)
        isSettingUpExperiment$.value = false
      })
  }

  const generateRandomAnswers = (): void => {
    if (!experimentPeriodId$.value) {
      console.error("No experiment period ID available")
      return
    }

    isGeneratingAnswers$.value = true
    generateRandomAnswersMutation({ periodId: experimentPeriodId$.value })
      .then((result) => {
        isGeneratingAnswers$.value = false
        console.log("Generated random answers:", result)
      })
      .catch((error) => {
        console.error("Failed to generate random answers:", error)
        isGeneratingAnswers$.value = false
      })
  }

  return {
    clearDialog,
    isSeedingData$,
    isClearingData$,
    isSettingUpExperiment$,
    isGeneratingAnswers$,
    experimentMapping$,
    experimentPeriodId$,
    seedTestData,
    clearAllData,
    confirmClear,
    setupExperiment,
    generateRandomAnswers,
  }
}
