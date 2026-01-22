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
    id: "create_topics",
    title: "Create Topics",
    description: "Topics are the projects or subjects that students will choose from. For example: 'Machine Learning Project', 'Web Development', or 'Data Analysis'. You can also configure topic-specific criteria here. Add at least one topic to get started.",
    actionLabel: "Add your first topic",
    targetView: "topics",
  },
  {
    id: "create_questions",
    title: "Create Questions",
    description: "Questions help you learn about your students so you can form balanced groups. For example: 'Do you have programming experience?' or 'Rate your teamwork skills'. These answers help match students fairly. Questions can be configured in the Project Assignments (Periods) tab.",
    actionLabel: "Set up questions",
    targetView: "periods",
  },
  {
    id: "create_period",
    title: "Create a Selection Period",
    description: "A selection period is a time window when students can sign up and choose their preferred topics. You'll set a start date and end date. Think of it like opening registration for a class.",
    actionLabel: "Create selection period",
    targetView: "periods",
  },
  {
    id: "add_students",
    title: "Invite Students",
    description: "Generate access codes or share a link so students can join. Each student gets a unique code to enter the selection. You can also let students use their own student ID.",
    actionLabel: "Set up student access",
    targetView: "periods",
  },
  {
    id: "run_assignment",
    title: "Assign Students to Topics",
    description: "Once students have submitted their preferences, click 'Assign' to automatically match students to topics based on their choices and questionnaire answers. The system finds the fairest assignment possible.",
    actionLabel: "View assignments",
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
