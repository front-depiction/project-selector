/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

/**
 * Helper to create a test selection period with minimizeCategoryIds
 */
async function createTestSelectionPeriod(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  minimizeCategoryIds?: Id<"categories">[]
): Promise<Id<"selectionPeriods">> {
  return await t.run(async (ctx: any) => {
    const now = Date.now()
    const futureOpen = now + (24 * 60 * 60 * 1000)
    const futureClose = now + (30 * 24 * 60 * 60 * 1000)

    return await ctx.db.insert("selectionPeriods", {
      userId: "test-user",
      title: "Test Selection Period",
      description: "Test period for selection questions",
      semesterId,
      openDate: futureOpen,
      closeDate: futureClose,
      shareableSlug: crypto.randomUUID(),
      kind: "inactive",
      minimizeCategoryIds
    })
  })
}

/**
 * Helper to create a category
 */
async function createTestCategory(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  name: string,
  criterionType: "minimize" | "pull" | "prerequisite" = "minimize"
): Promise<Id<"categories">> {
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("categories", {
      userId: "test-user",
      name,
      semesterId,
      criterionType,
      createdAt: Date.now()
    })
  })
}

/**
 * Helper to create test questions with a specific category
 */
async function createTestQuestions(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  category: string,
  count: number = 3
): Promise<Id<"questions">[]> {
  return await t.run(async (ctx: any) => {
    const questionIds: Id<"questions">[] = []

    for (let i = 0; i < count; i++) {
      const questionId = await ctx.db.insert("questions", {
        userId: "test-user",
        question: `Test question ${i + 1}`,
        kind: i % 2 === 0 ? "boolean" : "0to6",
        category,
        semesterId,
        createdAt: Date.now() + i // Ensure ordering
      })
      questionIds.push(questionId)
    }

    return questionIds
  })
}

/**
 * Helper to create a question template with questions
 */
async function createTestTemplate(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  questionIds: Id<"questions">[]
): Promise<Id<"questionTemplates">> {
  return await t.run(async (ctx: any) => {
    const templateId = await ctx.db.insert("questionTemplates", {
      title: "Test Template",
      description: "Template for testing",
      semesterId,
      createdAt: Date.now()
    })

    // Add questions to template
    for (let i = 0; i < questionIds.length; i++) {
      await ctx.db.insert("templateQuestions", {
        templateId,
        questionId: questionIds[i],
        order: i + 1
      })
    }

    return templateId
  })
}

test("selectionQuestions: getQuestionsForPeriod returns empty array when no categories linked", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-empty"
  const periodId = await createTestSelectionPeriod(t, semesterId)

  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toBeDefined()
  expect(questions).toHaveLength(0)

  vi.useRealTimers()
})

test("selectionQuestions: getQuestionsForPeriod returns questions from period's minimizeCategoryIds", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-minimize"

  // Create a category
  const categoryId = await createTestCategory(t, semesterId, "Technical Skills", "minimize")

  // Create questions in that category
  const questionIds = await createTestQuestions(t, semesterId, "Technical Skills", 3)

  // Create period with that category linked
  const periodId = await createTestSelectionPeriod(t, semesterId, [categoryId])

  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(3)
  expect(questions.map(q => q.questionId)).toEqual(expect.arrayContaining(questionIds))

  vi.useRealTimers()
})

test("selectionQuestions: getQuestionsForPeriod joins question data", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-join"

  // Create category and link to period
  const categoryId = await createTestCategory(t, semesterId, "Soft Skills", "minimize")
  const questionIds = await createTestQuestions(t, semesterId, "Soft Skills", 1)
  const periodId = await createTestSelectionPeriod(t, semesterId, [categoryId])

  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(1)
  expect(questions[0].question).toBeDefined()
  expect(questions[0].question?.question).toBe("Test question 1")
  expect(questions[0].question?.kind).toBe("boolean")

  vi.useRealTimers()
})

test("selectionQuestions: getQuestionsForPeriod returns questions from topic's constraintIds", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-topic-constraints"

  // Create a category with prerequisite type (topic-specific)
  const categoryId = await createTestCategory(t, semesterId, "Prerequisites", "prerequisite")

  // Create questions in that category
  const questionIds = await createTestQuestions(t, semesterId, "Prerequisites", 2)

  // Create a topic with that category as constraint
  await t.run(async (ctx: any) => {
    await ctx.db.insert("topics", {
      userId: "test-user",
      title: "Test Topic",
      description: "A test topic",
      semesterId,
      isActive: true,
      constraintIds: [categoryId]
    })
  })

  // Create period without minimizeCategoryIds
  const periodId = await createTestSelectionPeriod(t, semesterId)

  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(2)
  expect(questions.map(q => q.questionId)).toEqual(expect.arrayContaining(questionIds))

  vi.useRealTimers()
})

test("selectionQuestions: getQuestionsForPeriod combines questions from period and topics", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-combined"

  // Create two categories
  const minimizeCategory = await createTestCategory(t, semesterId, "Minimize Category", "minimize")
  const prerequisiteCategory = await createTestCategory(t, semesterId, "Prerequisite Category", "prerequisite")

  // Create questions in each category
  const minimizeQuestions = await createTestQuestions(t, semesterId, "Minimize Category", 2)
  const prerequisiteQuestions = await createTestQuestions(t, semesterId, "Prerequisite Category", 2)

  // Create a topic with prerequisite category
  await t.run(async (ctx: any) => {
    await ctx.db.insert("topics", {
      userId: "test-user",
      title: "Test Topic",
      description: "A test topic",
      semesterId,
      isActive: true,
      constraintIds: [prerequisiteCategory]
    })
  })

  // Create period with minimize category
  const periodId = await createTestSelectionPeriod(t, semesterId, [minimizeCategory])

  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(4)
  const allQuestionIds = [...minimizeQuestions, ...prerequisiteQuestions]
  expect(questions.map(q => q.questionId)).toEqual(expect.arrayContaining(allQuestionIds))

  vi.useRealTimers()
})

test("selectionQuestions: addQuestion adds to selectionQuestions table", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-add"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, "test-category", 1)

  // Add question to selection period
  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Verify it was added to selectionQuestions table directly
  const selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })

  expect(selectionQuestions).toHaveLength(1)
  expect(selectionQuestions[0].questionId).toBe(questionId)
  expect(selectionQuestions[0].order).toBe(1)

  vi.useRealTimers()
})

test("selectionQuestions: addQuestion increments order correctly", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-order"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, "test-category", 3)

  // Add multiple questions
  for (const questionId of questionIds) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: periodId,
      questionId
    })
  }

  // Verify order in selectionQuestions table
  const selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })

  expect(selectionQuestions).toHaveLength(3)
  selectionQuestions.sort((a: any, b: any) => a.order - b.order)
  expect(selectionQuestions[0].order).toBe(1)
  expect(selectionQuestions[1].order).toBe(2)
  expect(selectionQuestions[2].order).toBe(3)

  vi.useRealTimers()
})

test("selectionQuestions: removeQuestion removes from selectionQuestions table", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-remove"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, "test-category", 1)

  // Add question
  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Verify it was added
  let selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })
  expect(selectionQuestions).toHaveLength(1)

  // Remove question
  await t.mutation(api.selectionQuestions.removeQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Verify it was removed
  selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })
  expect(selectionQuestions).toHaveLength(0)

  vi.useRealTimers()
})

test("selectionQuestions: removeQuestion does nothing for non-existent question", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-remove-missing"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, "test-category", 1)

  // Try to remove a question that was never added
  await t.mutation(api.selectionQuestions.removeQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Should still be empty
  const selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })
  expect(selectionQuestions).toHaveLength(0)

  vi.useRealTimers()
})

test("selectionQuestions: reorder changes question order in selectionQuestions table", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-reorder"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, "test-category", 3)

  // Add questions in order
  for (const questionId of questionIds) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: periodId,
      questionId
    })
  }

  // Reorder to: [q2, q0, q1]
  const newOrder = [questionIds[2], questionIds[0], questionIds[1]]
  await t.mutation(api.selectionQuestions.reorder, {
    selectionPeriodId: periodId,
    questionIds: newOrder
  })

  // Verify new order in selectionQuestions table
  const selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })

  selectionQuestions.sort((a: any, b: any) => a.order - b.order)
  expect(selectionQuestions.map((sq: any) => sq.questionId)).toEqual(newOrder)

  vi.useRealTimers()
})

test("selectionQuestions: applyTemplate copies questions from template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-template"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, "test-category", 3)
  const templateId = await createTestTemplate(t, semesterId, questionIds)

  // Apply template
  await t.mutation(api.selectionQuestions.applyTemplate, {
    selectionPeriodId: periodId,
    templateId
  })

  // Verify questions were copied to selectionQuestions table
  const selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })

  expect(selectionQuestions).toHaveLength(3)
  expect(selectionQuestions.map((sq: any) => sq.questionId).sort()).toEqual(questionIds.sort())
  expect(selectionQuestions[0].sourceTemplateId).toBe(templateId)
  expect(selectionQuestions[1].sourceTemplateId).toBe(templateId)
  expect(selectionQuestions[2].sourceTemplateId).toBe(templateId)

  vi.useRealTimers()
})

test("selectionQuestions: applyTemplate with empty template does nothing", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-test-empty-template"
  const periodId = await createTestSelectionPeriod(t, semesterId)

  // Create empty template
  const templateId = await t.run(async (ctx: any) => {
    return await ctx.db.insert("questionTemplates", {
      title: "Empty Template",
      description: "No questions",
      semesterId,
      createdAt: Date.now()
    })
  })

  // Apply empty template
  await t.mutation(api.selectionQuestions.applyTemplate, {
    selectionPeriodId: periodId,
    templateId
  })

  // Verify no questions were added
  const selectionQuestions = await t.run(async (ctx: any) => {
    return await ctx.db
      .query("selectionQuestions")
      .withIndex("by_selection_period", (q: any) => q.eq("selectionPeriodId", periodId))
      .collect()
  })
  expect(selectionQuestions).toHaveLength(0)

  vi.useRealTimers()
})
