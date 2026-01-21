"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, Edit2, Loader2 } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import type { api } from "@/convex/_generated/api"

type StudentAnswerData = FunctionReturnType<typeof api.studentAnswers.getQuestionsWithAnswersForStudent>[number]

const createFormSchema = (questions: readonly StudentAnswerData[]) => {
  const schemaObject: Record<string, z.ZodTypeAny> = {}
  
  for (const q of questions) {
    if (q.kind === "boolean") {
      schemaObject[q.questionId] = z.boolean().optional()
    } else {
      schemaObject[q.questionId] = z.number().min(0).max(6).optional()
    }
  }
  
  return z.object(schemaObject)
}

export type StudentQuestionnaireEditFormValues = z.infer<ReturnType<typeof createFormSchema>>

export interface StudentQuestionnaireEditFormProps {
  questions: readonly StudentAnswerData[]
  onSubmit: (answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>) => Promise<void>
  isSubmitting?: boolean
  periodTitle?: string
}

export function StudentQuestionnaireEditForm({
  questions,
  onSubmit,
  isSubmitting = false,
  periodTitle,
}: StudentQuestionnaireEditFormProps) {
  const formSchema = React.useMemo(() => createFormSchema(questions), [questions])
  
  // Build default values from existing answers
  const defaultValues = React.useMemo(() => {
    const values: Record<string, boolean | number | undefined> = {}
    for (const q of questions) {
      if (q.answer) {
        if (q.kind === "boolean") {
          values[q.questionId] = q.answer.rawAnswer.kind === "boolean" ? q.answer.rawAnswer.value : undefined
        } else {
          values[q.questionId] = q.answer.rawAnswer.kind === "0to6" ? q.answer.rawAnswer.value : undefined
        }
      }
    }
    return values
  }, [questions])

  const form = useForm<StudentQuestionnaireEditFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Calculate answered count
  const answeredCount = React.useMemo(() => {
    return questions.filter(q => q.answer !== null).length
  }, [questions])

  async function handleSubmit(values: StudentQuestionnaireEditFormValues) {
    const answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }> = []
    
    for (const q of questions) {
      const answerValue = values[q.questionId as string]
      if (answerValue !== undefined && answerValue !== null) {
        answers.push({
          questionId: q.questionId as Id<"questions">,
          kind: q.kind,
          value: answerValue as boolean | number,
        })
      }
    }
    
    await onSubmit(answers)
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No questions available for this period.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <Card className="mb-6 border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Edit2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Edit Your Answers</CardTitle>
                <CardDescription>
                  {periodTitle ? `${periodTitle} - ` : ""}Review and modify your questionnaire responses
                </CardDescription>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{answeredCount} of {questions.length} questions answered</span>
                <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
              </div>
              <Progress value={(answeredCount / questions.length) * 100} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {questions.map((question, index) => {
              const hasAnswer = question.answer !== null

              return (
                <Card key={question.questionId} className="border-border/50">
                  <CardContent className="pt-6">
                    <FormField
                      control={form.control}
                      name={question.questionId as string}
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1 space-y-1">
                              <FormLabel className="text-base font-semibold leading-relaxed">
                                {question.questionText}
                              </FormLabel>
                              <div className="flex items-center gap-2">
                                {question.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {question.category}
                                  </Badge>
                                )}
                                {hasAnswer && (
                                  <Badge variant="secondary" className="text-xs">
                                    Answered
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-11">
                            <FormDescription className="mb-3">
                              {question.kind === "boolean"
                                ? "Select Yes or No"
                                : "Rate from 0 (Not at all) to 6 (Extremely)"}
                            </FormDescription>
                            <FormControl>
                              {question.kind === "boolean" ? (
                                <RadioGroup
                                  value={field.value?.toString()}
                                  onValueChange={(value) => {
                                    field.onChange(value === "true" ? true : value === "false" ? false : undefined)
                                  }}
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="true" id={`${question.questionId}-yes`} />
                                    <Label htmlFor={`${question.questionId}-yes`} className="cursor-pointer font-normal text-base">
                                      Yes
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="false" id={`${question.questionId}-no`} />
                                    <Label htmlFor={`${question.questionId}-no`} className="cursor-pointer font-normal text-base">
                                      No
                                    </Label>
                                  </div>
                                </RadioGroup>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between px-1">
                                    <span className="text-sm text-muted-foreground">0 - Not at all</span>
                                    <span className="text-3xl font-bold text-primary">{(field.value as number | undefined) ?? 3}</span>
                                    <span className="text-sm text-muted-foreground">6 - Extremely</span>
                                  </div>
                                  <Slider
                                    value={[(field.value as number | undefined) ?? 3]}
                                    onValueChange={([value]) => field.onChange(value)}
                                    min={0}
                                    max={6}
                                    step={1}
                                    className="w-full"
                                  />
                                  <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: 7 }, (_, i) => i).map((num) => (
                                      <Button
                                        key={num}
                                        type="button"
                                        variant={field.value === num ? "default" : "outline"}
                                        size="sm"
                                        className="h-10 text-sm font-medium"
                                        onClick={() => field.onChange(num)}
                                      >
                                        {num}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )
            })}

            {/* Submit Button */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Your answers will be saved and you can proceed to the next step.
                  </p>
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save and Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  )
}
