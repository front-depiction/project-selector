"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"
import { useStudentQuestionPresentationVM } from "./StudentQuestionPresentationViewVM"

// ============================================================================
// TYPES
// ============================================================================

export interface StudentQuestionPresentationViewProps {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly onComplete?: () => void
}

// ============================================================================
// MAIN VIEW
// ============================================================================

export const StudentQuestionPresentationView: React.FC<StudentQuestionPresentationViewProps> = ({
  studentId,
  selectionPeriodId,
  onComplete,
}) => {
  useSignals()
  const vm = useStudentQuestionPresentationVM({ studentId, selectionPeriodId, onComplete })

  // Loading state
  if (!vm.currentQuestion$.value && vm.totalQuestions$.value === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    )
  }

  // No questions state
  if (!vm.currentQuestion$.value) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">No questions available.</p>
        </div>
      </div>
    )
  }

  const question = vm.currentQuestion$.value
  const currentAnswer = vm.currentAnswer$.value
  const isLast = vm.isLast$.value
  const isFirst = vm.isFirst$.value
  const isComplete = vm.isComplete$.value
  const isSubmitting = vm.isSubmitting$.value

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl flex flex-col gap-8">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={vm.progress$.value} className="h-3" />
          <p className="text-sm text-muted-foreground text-center">
            Question {vm.currentIndex$.value + 1} of {vm.totalQuestions$.value}
          </p>
        </div>

        {/* Question Text */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            {question.text}
          </h1>
        </div>

        {/* Answer Input */}
        <div className="flex flex-col items-center gap-8">
          {question.kind === "boolean" ? (
            <BooleanAnswerInput
              value={currentAnswer as boolean | undefined}
              onChange={vm.setAnswer}
            />
          ) : (
            <ScaleAnswerInput
              value={currentAnswer as number | undefined}
              onChange={vm.setAnswer}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={vm.previous}
            disabled={isFirst}
            className="h-16 w-32 text-xl"
          >
            <ArrowLeft className="h-6 w-6 mr-2" />
            Previous
          </Button>

          {isLast ? (
            <Button
              size="lg"
              onClick={vm.submit}
              disabled={!isComplete || isSubmitting}
              className="h-16 w-32 text-xl"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-6 w-6 mr-2" />
                  Submit
                </>
              )}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={vm.next}
              className="h-16 w-32 text-xl"
            >
              Next
              <ArrowRight className="h-6 w-6 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ANSWER INPUT COMPONENTS
// ============================================================================

interface BooleanAnswerInputProps {
  readonly value?: boolean
  readonly onChange: (value: boolean) => void
}

const BooleanAnswerInput: React.FC<BooleanAnswerInputProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-8">
      <Button
        type="button"
        size="lg"
        variant={value === true ? "default" : "outline"}
        className={cn(
          "h-24 w-40 text-3xl font-bold transition-all",
          value === true && "ring-4 ring-primary ring-offset-4 scale-105"
        )}
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        type="button"
        size="lg"
        variant={value === false ? "default" : "outline"}
        className={cn(
          "h-24 w-40 text-3xl font-bold transition-all",
          value === false && "ring-4 ring-primary ring-offset-4 scale-105"
        )}
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  )
}

interface ScaleAnswerInputProps {
  readonly value?: number
  readonly onChange: (value: number) => void
}

const ScaleAnswerInput: React.FC<ScaleAnswerInputProps> = ({ value, onChange }) => {
  const currentValue = value ?? 5

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Labels */}
      <div className="flex justify-between text-base sm:text-lg text-muted-foreground">
        <span>0 - Not at all</span>
        <span>10 - Extremely</span>
      </div>

      {/* Number Display */}
      <div className="text-center">
        <div className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight">
          {currentValue}
        </div>
      </div>

      {/* Number Buttons */}
      <div className="grid grid-cols-11 gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((num) => (
          <Button
            key={num}
            type="button"
            variant={currentValue === num ? "default" : "outline"}
            className={cn(
              "h-16 text-xl font-bold transition-all",
              currentValue === num && "ring-2 ring-primary scale-110"
            )}
            onClick={() => onChange(num)}
          >
            {num}
          </Button>
        ))}
      </div>
    </div>
  )
}
