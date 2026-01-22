"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
import type { Id } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"
import type { api } from "@/convex/_generated/api"

type StudentAnswerData = FunctionReturnType<typeof api.studentAnswers.getStudentAnswersForTeacher>[number]

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

export type TeacherQuestionnaireFormValues = z.infer<ReturnType<typeof createFormSchema>>

export interface TeacherQuestionnaireFormProps {
  questions: readonly StudentAnswerData[]
  onSubmit: (answers: Array<{ questionId: Id<"questions">; kind: "boolean" | "0to6"; value: boolean | number }>) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export default function TeacherQuestionnaireForm({
  questions,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TeacherQuestionnaireFormProps) {
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

  const form = useForm<TeacherQuestionnaireFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function handleSubmit(values: TeacherQuestionnaireFormValues) {
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
      <div className="py-8 text-center text-muted-foreground">
        No questions available for this period.
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="max-h-[60vh] space-y-8 overflow-y-auto pr-4">
          {questions.map((question) => {
            const hasAnswer = question.answer !== null
            const characteristicBadge = question.characteristicName ? (
              <Badge variant="outline" className="ml-2">
                {question.characteristicName}
              </Badge>
            ) : null

            return (
              <FormField
                key={question.questionId}
                control={form.control}
                name={question.questionId as string}
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-base font-semibold">
                        {question.questionText}
                      </FormLabel>
                      {characteristicBadge}
                      {hasAnswer && (
                        <Badge variant="secondary" className="ml-auto">
                          Previously answered
                        </Badge>
                      )}
                    </div>
                    <FormDescription>
                      {question.kind === "boolean"
                        ? "Select Yes or No"
                        : "Rate from 0 (Not at all) to 10 (Extremely)"}
                    </FormDescription>
                    <FormControl>
                      {question.kind === "boolean" ? (
                        <RadioGroup
                          value={field.value?.toString()}
                          onValueChange={(value) => {
                            field.onChange(value === "true" ? true : value === "false" ? false : undefined)
                          }}
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id={`${question.questionId}-yes`} />
                            <Label htmlFor={`${question.questionId}-yes`} className="cursor-pointer font-normal">
                              Yes
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id={`${question.questionId}-no`} />
                            <Label htmlFor={`${question.questionId}-no`} className="cursor-pointer font-normal">
                              No
                            </Label>
                          </div>
                        </RadioGroup>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <span className="text-sm text-muted-foreground">0 - Not at all</span>
                            <span className="text-2xl font-bold">{(field.value as number | undefined) ?? 3}</span>
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
                          <div className="grid grid-cols-7 gap-1 px-2">
                            {Array.from({ length: 7 }, (_, i) => i).map((num) => (
                              <Button
                                key={num}
                                type="button"
                                variant={field.value === num ? "default" : "outline"}
                                size="sm"
                                className="h-8 text-xs"
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
                  </FormItem>
                )}
              />
            )
          })}
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Answers"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
