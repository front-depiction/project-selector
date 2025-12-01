import { v } from "convex/values"
import type { Infer } from "convex/values"
import type { Id } from "../_generated/dataModel"

export const SelectionQuestion = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  questionId: v.id("questions"),
  order: v.number(),
  sourceTemplateId: v.optional(v.id("questionTemplates")),
})

export type SelectionQuestion = Readonly<Infer<typeof SelectionQuestion>>

export const make = (params: {
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly questionId: Id<"questions">
  readonly order: number
  readonly sourceTemplateId?: Id<"questionTemplates">
}): SelectionQuestion => ({
  selectionPeriodId: params.selectionPeriodId,
  questionId: params.questionId,
  order: params.order,
  sourceTemplateId: params.sourceTemplateId,
})

export const makeFromTemplate = (params: {
  readonly selectionPeriodId: Id<"selectionPeriods">
  readonly questionId: Id<"questions">
  readonly order: number
  readonly sourceTemplateId: Id<"questionTemplates">
}): SelectionQuestion => ({
  selectionPeriodId: params.selectionPeriodId,
  questionId: params.questionId,
  order: params.order,
  sourceTemplateId: params.sourceTemplateId,
})
