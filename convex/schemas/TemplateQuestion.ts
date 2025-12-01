import { v } from "convex/values"
import type { Infer } from "convex/values"
import type { Id } from "../_generated/dataModel"

export const TemplateQuestion = v.object({
  templateId: v.id("questionTemplates"),
  questionId: v.id("questions"),
  order: v.number(),
})

export type TemplateQuestion = Readonly<Infer<typeof TemplateQuestion>>

export const make = (params: {
  readonly templateId: Id<"questionTemplates">
  readonly questionId: Id<"questions">
  readonly order: number
}): TemplateQuestion => ({
  templateId: params.templateId,
  questionId: params.questionId,
  order: params.order,
})
