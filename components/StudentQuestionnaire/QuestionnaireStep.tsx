"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { BooleanQuestion } from "./BooleanQuestion"
import { ScaleQuestion } from "./ScaleQuestion"
import type { Id } from "@/convex/_generated/dataModel"

interface QuestionnaireStepProps {
  readonly studentId: string
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly onComplete: () => void
}

export const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  studentId,
  selectionPeriodId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Map<string, boolean | number>>(new Map())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const questionsData = useQuery(api.selectionQuestions.getQuestionsForPeriod, { selectionPeriodId })
  const saveAnswers = useMutation(api.studentAnswers.saveAnswers)

  // Filter out entries with null questions and map to a simpler structure
  const questions = React.useMemo(() => {
    if (!questionsData) return []
    return questionsData
      .filter(sq => sq.question !== null)
      .map(sq => ({
        questionId: sq.questionId,
        text: sq.question!.question,
        kind: sq.question!.kind
      }))
  }, [questionsData])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const handleAnswer = (questionId: string, value: boolean | number) => {
    setAnswers(prev => new Map(prev).set(questionId, value))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const answersArray = questions.map(q => ({
        questionId: q.questionId,
        kind: q.kind,
        value: answers.get(q.questionId as string) ?? (q.kind === "boolean" ? false : 5)
      }))
      await saveAnswers({ studentId, selectionPeriodId, answers: answersArray })
      onComplete()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!questions.length) {
    return <div className="text-center p-8">Loading questions...</div>
  }

  const isLast = currentIndex === questions.length - 1
  const currentAnswer = answers.get(currentQuestion.questionId as string)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground text-center">
        Question {currentIndex + 1} of {questions.length}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{currentQuestion.text}</CardTitle>
          <CardDescription>
            {currentQuestion.kind === "boolean" ? "Select Yes or No" : "Select a value from 0 to 10"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentQuestion.kind === "boolean" ? (
            <BooleanQuestion
              value={currentAnswer as boolean | undefined}
              onChange={(v) => handleAnswer(currentQuestion.questionId as string, v)}
            />
          ) : (
            <ScaleQuestion
              value={currentAnswer as number | undefined}
              onChange={(v) => handleAnswer(currentQuestion.questionId as string, v)}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Check className="h-4 w-4 mr-2" /> Submit
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
