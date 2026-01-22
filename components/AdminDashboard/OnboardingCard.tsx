"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import * as Option from "effect/Option"
import {
  IconArchive,
  IconChevronRight,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconDots,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { OnboardingVM } from "./OnboardingVM"

// ============================================================================
// Props
// ============================================================================

export interface OnboardingCardProps {
  readonly vm: OnboardingVM
}

// ============================================================================
// CircularProgress Component
// ============================================================================

function CircularProgress({
  completed,
  total,
}: {
  completed: number
  total: number
}) {
  const progress = total > 0 ? ((total - completed) / total) * 100 : 0
  const strokeDashoffset = 100 - progress

  return (
    <svg
      className="-rotate-90 scale-y-[-1]"
      height="14"
      width="14"
      viewBox="0 0 14 14"
    >
      <circle
        className="stroke-muted"
        cx="7"
        cy="7"
        fill="none"
        r="6"
        strokeWidth="2"
        pathLength="100"
      />
      <circle
        className="stroke-primary"
        cx="7"
        cy="7"
        fill="none"
        r="6"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray="100"
        strokeLinecap="round"
        style={{ strokeDashoffset }}
      />
    </svg>
  )
}

// ============================================================================
// StepIndicator Component
// ============================================================================

function StepIndicator({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <IconCircleCheckFilled
        className="mt-1 size-4.5 shrink-0 text-primary"
        aria-hidden="true"
      />
    )
  }
  return (
    <IconCircleDashed
      className="mt-1 size-5 shrink-0 stroke-muted-foreground/40"
      strokeWidth={2}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingCard({ vm }: OnboardingCardProps): React.ReactElement | null {
  useSignals()

  // If dismissed or complete, don't show
  if (vm.isDismissed$.value || vm.isComplete$.value) {
    return null
  }

  const steps = vm.steps$.value
  const completedCount = vm.completedCount$.value
  const totalSteps = vm.totalSteps$.value
  const remainingCount = totalSteps - completedCount
  const expandedStepId = vm.expandedStepId$.value

  return (
    <div className="w-full max-w-xl">
      <div className="w-xl rounded-lg border bg-card p-4 text-card-foreground shadow-xs">
        <div className="mb-4 mr-2 flex flex-col justify-between sm:flex-row sm:items-center">
          <h3 className="ml-2 font-semibold text-foreground">
            Get started with Project Selector
          </h3>
          <div className="mt-2 flex items-center justify-end sm:mt-0">
            <CircularProgress
              completed={remainingCount}
              total={totalSteps}
            />
            <div className="ml-1.5 mr-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {remainingCount}
              </span>{" "}
              out of{" "}
              <span className="font-medium text-foreground">
                {totalSteps} steps
              </span>{" "}
              left
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <IconDots className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={vm.dismiss}>
                  <IconArchive
                    className="mr-2 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => {
            const isOpen = Option.isSome(expandedStepId) && expandedStepId.value === step.id
            const isFirst = index === 0
            const prevStep = steps[index - 1]
            const isPrevOpen = prevStep && Option.isSome(expandedStepId) && expandedStepId.value === prevStep.id

            const showBorderTop = !isFirst && !isOpen && !isPrevOpen

            return (
              <div
                key={step.id}
                className={cn(
                  "group",
                  isOpen && "rounded-lg",
                  showBorderTop && "border-t border-border"
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isOpen) {
                      vm.setExpandedStep(null)
                    } else {
                      vm.setExpandedStep(step.id)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      if (isOpen) {
                        vm.setExpandedStep(null)
                      } else {
                        vm.setExpandedStep(step.id)
                      }
                    }
                  }}
                  className={cn(
                    "block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isOpen && "rounded-lg"
                  )}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-lg transition-colors",
                      isOpen && "border border-border bg-muted"
                    )}
                  >
                    <div className="relative flex items-center justify-between gap-3 py-3 pl-4 pr-2">
                      <div className="flex w-full gap-3">
                        <div className="shrink-0">
                          <StepIndicator completed={step.isComplete} />
                        </div>
                        <div className="mt-0.5 grow">
                          <h4
                            className={cn(
                              "font-semibold",
                              step.isComplete
                                ? "text-primary"
                                : "text-foreground"
                            )}
                          >
                            {step.title}
                          </h4>
                          <div
                            className={cn(
                              "overflow-hidden transition-all duration-200",
                              isOpen ? "h-auto opacity-100" : "h-0 opacity-0"
                            )}
                          >
                            <p className="mt-2 text-sm text-muted-foreground sm:max-w-64 md:max-w-xs">
                              {step.description}
                            </p>
                            <Button
                              size="sm"
                              className="mt-3"
                              onClick={(e) => {
                                e.stopPropagation()
                                vm.navigateToStep(step.id)
                              }}
                            >
                              {step.actionLabel}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {!isOpen && (
                        <IconChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
