import { signal, computed, ReadonlySignal, batch } from "@preact/signals-react"
import * as Option from "effect/Option"

// ============================================================================
// View Model Types
// ============================================================================

/**
 * Represents a single onboarding step
 */
export interface OnboardingStep {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly actionLabel: string
  readonly targetView: string  // Which view to navigate to
  readonly isComplete: boolean
}

/**
 * View Model for the onboarding component
 */
export interface OnboardingVM {
  readonly steps$: ReadonlySignal<readonly OnboardingStep[]>
  readonly completedCount$: ReadonlySignal<number>
  readonly totalSteps$: ReadonlySignal<number>
  readonly isComplete$: ReadonlySignal<boolean>
  readonly isDismissed$: ReadonlySignal<boolean>
  readonly expandedStepId$: ReadonlySignal<Option.Option<string>>

  readonly markComplete: (stepId: string) => void
  readonly dismiss: () => void
  readonly setExpandedStep: (stepId: string | null) => void
  readonly navigateToStep: (stepId: string) => void
}

// ============================================================================
// Dependencies - data passed in from outside
// ============================================================================

export interface OnboardingVMDeps {
  readonly onboardingData$: ReadonlySignal<{ completedSteps: string[], dismissedAt?: number } | null | undefined>
  readonly markStepComplete: (args: { stepId: string }) => Promise<void>
  readonly dismissOnboarding: () => Promise<void>
  readonly setActiveView: (view: string) => void
}

// ============================================================================
// Step Definitions
// ============================================================================

const ONBOARDING_STEP_DEFINITIONS: readonly Omit<OnboardingStep, "isComplete">[] = [
  {
    id: "create-topics",
    title: "Create Topics",
    description: "Add project topics for students to choose from",
    actionLabel: "Go to Topics",
    targetView: "topics",
  },
  {
    id: "create-questions",
    title: "Create Questions",
    description: "Set up questionnaire for balanced groups",
    actionLabel: "Go to Questionnaires",
    targetView: "questionnaires",
  },
  {
    id: "create-period",
    title: "Create Period",
    description: "Create a selection period with dates",
    actionLabel: "Go to Periods",
    targetView: "periods",
  },
  {
    id: "add-students",
    title: "Add Students",
    description: "Generate access codes for students",
    actionLabel: "Go to Students",
    targetView: "students",
  },
  {
    id: "run-assignment",
    title: "Run Assignment",
    description: "Assign students to topics",
    actionLabel: "Go to Periods",
    targetView: "periods",
  },
]

// ============================================================================
// Factory - creates VM from dependencies
// ============================================================================

export function createOnboardingVM(deps: OnboardingVMDeps): OnboardingVM {
  const {
    onboardingData$,
    markStepComplete,
    dismissOnboarding,
    setActiveView,
  } = deps

  // Local UI state - created once
  const expandedStepId$ = signal<Option.Option<string>>(Option.none())

  // Computed: steps with completion status merged from data
  const steps$ = computed((): readonly OnboardingStep[] => {
    const onboardingData = onboardingData$.value
    const completedSteps = onboardingData?.completedSteps ?? []

    return ONBOARDING_STEP_DEFINITIONS.map((stepDef): OnboardingStep => ({
      ...stepDef,
      isComplete: completedSteps.includes(stepDef.id),
    }))
  })

  // Computed: count of completed steps
  const completedCount$ = computed((): number => {
    return steps$.value.filter(step => step.isComplete).length
  })

  // Computed: total number of steps
  const totalSteps$ = computed((): number => {
    return steps$.value.length
  })

  // Computed: whether all steps are complete
  const isComplete$ = computed((): boolean => {
    return completedCount$.value === totalSteps$.value
  })

  // Computed: whether onboarding has been dismissed
  const isDismissed$ = computed((): boolean => {
    const onboardingData = onboardingData$.value
    return onboardingData?.dismissedAt !== undefined
  })

  // Action: mark a step as complete
  const markComplete = (stepId: string): void => {
    markStepComplete({ stepId }).catch(console.error)
  }

  // Action: dismiss the onboarding
  const dismiss = (): void => {
    dismissOnboarding().catch(console.error)
  }

  // Action: set expanded step (accordion behavior)
  const setExpandedStep = (stepId: string | null): void => {
    expandedStepId$.value = Option.fromNullable(stepId)
  }

  // Action: navigate to a step's target view
  const navigateToStep = (stepId: string): void => {
    const step = steps$.value.find(s => s.id === stepId)
    if (step) {
      setActiveView(step.targetView)
    }
  }

  return {
    steps$,
    completedCount$,
    totalSteps$,
    isComplete$,
    isDismissed$,
    expandedStepId$,
    markComplete,
    dismiss,
    setExpandedStep,
    navigateToStep,
  }
}
