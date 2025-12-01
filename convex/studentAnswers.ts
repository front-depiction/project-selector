import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import * as StudentAnswer from "./schemas/StudentAnswer"

export const getAnswers = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
         .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .collect()
  }
})

export const hasCompletedQuestionnaire = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    const answers = await ctx.db.query("studentAnswers")
      .withIndex("by_student_period", q =>
        q.eq("studentId", args.studentId)
         .eq("selectionPeriodId", args.selectionPeriodId)
      )
      .first()

    return answers !== null
  }
})

export const saveAnswers = mutation({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods"),
    answers: v.array(v.object({
      questionId: v.id("questions"),
      kind: v.union(v.literal("boolean"), v.literal("0to10")),
      value: v.union(v.boolean(), v.number())
    }))
  },
  handler: async (ctx, args) => {
    for (const answer of args.answers) {
      // Check if exists
      const existing = await ctx.db.query("studentAnswers")
        .withIndex("by_student_period", q => q.eq("studentId", args.studentId).eq("selectionPeriodId", args.selectionPeriodId))
        .filter(q => q.eq(q.field("questionId"), answer.questionId))
        .first()

      const data = answer.kind === "boolean"
        ? StudentAnswer.makeBoolean({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as boolean })
        : StudentAnswer.makeZeroToTen({ studentId: args.studentId, selectionPeriodId: args.selectionPeriodId, questionId: answer.questionId, value: answer.value as number })

      if (existing) {
        await ctx.db.patch(existing._id, data)
      } else {
        await ctx.db.insert("studentAnswers", data)
      }
    }
  }
})
