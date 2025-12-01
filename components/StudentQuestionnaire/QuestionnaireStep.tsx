"use client"

import * as React from "react"
import { useSignals } from "@preact/signals-react/runtime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { BooleanQuestion } from "./BooleanQuestion"
import { ScaleQuestion } from "./ScaleQuestion"
import type { Id } from "@/convex/_generated/dataModel"
import { useStudentQuestionPresentationVM } from "./StudentQuestionPresentationViewVM"

// ============================================================================
// TYPES
// ============================================================================

interface QuestionnaireStepProps {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly onComplete: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  studentId,
  selectionPeriodId,
  onComplete,
}) => {
  useSignals()
  const vm = useStudentQuestionPresentationVM({ studentId, selectionPeriodId, onComplete })

  // Loading state
  if (!vm.currentQuestion$.value && vm.totalQuestions$.value === 0) {
    return <div className="text-center p-8">Loading questions...</div>
  }

  // No questions state
  if (!vm.currentQuestion$.value) {
    return <div className="text-center p-8">No questions available.</div>
  }

  const question = vm.currentQuestion$.value
  const currentAnswer = vm.currentAnswer$.value
  const isLast = vm.isLast$.value
  const isFirst = vm.isFirst$.value
  const isSubmitting = vm.isSubmitting$.value

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Progress value={vm.progress$.value} className="h-2" />
      <p className="text-sm text-muted-foreground text-center">
        Question {vm.currentIndex$.value + 1} of {vm.totalQuestions$.value}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{question.text}</CardTitle>
          <CardDescription>
            {question.kind === "boolean" ? "Select Yes or No" : "Select a value from 0 to 10"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {question.kind === "boolean" ? (
            <BooleanQuestion
              value={currentAnswer as boolean | undefined}
              onChange={vm.setAnswer}
            />
          ) : (
            <ScaleQuestion
              value={currentAnswer as number | undefined}
              onChange={vm.setAnswer}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={vm.previous} disabled={isFirst}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        {isLast ? (
          <Button onClick={vm.submit} disabled={isSubmitting}>
            <Check className="h-4 w-4 mr-2" /> {isSubmitting ? "Saving..." : "Submit"}
          </Button>
        ) : (
          <Button onClick={vm.next}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
