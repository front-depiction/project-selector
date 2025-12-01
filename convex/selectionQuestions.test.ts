/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

/**
 * Helper to create a test selection period
 */
async function createTestSelectionPeriod(
  t: ReturnType<typeof convexTest>,
  semesterId: string
): Promise<Id<"selectionPeriods">> {
  return await t.run(async (ctx: any) => {
    const now = Date.now()
    const futureOpen = now + (24 * 60 * 60 * 1000)
    const futureClose = now + (30 * 24 * 60 * 60 * 1000)

    return await ctx.db.insert("selectionPeriods", {
      title: "Test Selection Period",
      description: "Test period for selection questions",
      semesterId,
      openDate: futureOpen,
      closeDate: futureClose,
      kind: "inactive"
    })
  })
}

/**
 * Helper to create test questions
 */
async function createTestQuestions(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  count: number = 3
): Promise<Id<"questions">[]> {
  return await t.run(async (ctx: any) => {
    const questionIds: Id<"questions">[] = []

    for (let i = 0; i < count; i++) {
      const questionId = await ctx.db.insert("questions", {
        question: `Test question ${i + 1}`,
        kind: i % 2 === 0 ? "boolean" : "0to10",
        semesterId,
        createdAt: Date.now()
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

test("selectionQuestions: getQuestionsForPeriod returns empty array initially", async () => {
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

test("selectionQuestions: addQuestion adds a question to selection period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-add"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, 1)

  // Add question to selection period
  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Verify it was added
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(1)
  expect(questions[0].questionId).toBe(questionId)
  expect(questions[0].order).toBe(1)
  expect(questions[0].sourceTemplateId).toBeUndefined()

  vi.useRealTimers()
})

test("selectionQuestions: addQuestion increments order correctly", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-order"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add multiple questions
  for (const questionId of questionIds) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: periodId,
      questionId
    })
  }

  // Verify order
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(3)
  expect(questions[0].order).toBe(1)
  expect(questions[1].order).toBe(2)
  expect(questions[2].order).toBe(3)

  vi.useRealTimers()
})

test("selectionQuestions: getQuestionsForPeriod joins question data", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-join"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, 1)

  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(1)
  expect(questions[0].question).toBeDefined()
  expect(questions[0].question).not.toBeNull()
  expect(questions[0].question?.question).toBe("Test question 1")
  expect(questions[0].question?.kind).toBe("boolean")

  vi.useRealTimers()
})

test("selectionQuestions: removeQuestion removes a question from selection period", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-remove"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, 1)

  // Add question
  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Verify it was added
  let questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(1)

  // Remove question
  await t.mutation(api.selectionQuestions.removeQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Verify it was removed
  questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(0)

  vi.useRealTimers()
})

test("selectionQuestions: removeQuestion does nothing for non-existent question", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-remove-missing"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const [questionId] = await createTestQuestions(t, semesterId, 1)

  // Try to remove a question that was never added
  await t.mutation(api.selectionQuestions.removeQuestion, {
    selectionPeriodId: periodId,
    questionId
  })

  // Should still be empty
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(0)

  vi.useRealTimers()
})

test("selectionQuestions: reorder changes question order", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-reorder"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add questions in order
  for (const questionId of questionIds) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: periodId,
      questionId
    })
  }

  // Original order: [q0, q1, q2]
  let questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions.map(q => q.questionId)).toEqual(questionIds)

  // Reorder to: [q2, q0, q1]
  const newOrder = [questionIds[2], questionIds[0], questionIds[1]]
  await t.mutation(api.selectionQuestions.reorder, {
    selectionPeriodId: periodId,
    questionIds: newOrder
  })

  // Verify new order
  questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions.map(q => q.questionId)).toEqual(newOrder)
  expect(questions[0].order).toBe(1)
  expect(questions[1].order).toBe(2)
  expect(questions[2].order).toBe(3)

  vi.useRealTimers()
})

test("selectionQuestions: reorder handles partial reordering", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-reorder-partial"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add questions
  for (const questionId of questionIds) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: periodId,
      questionId
    })
  }

  // Reorder only the first two questions (swap them)
  await t.mutation(api.selectionQuestions.reorder, {
    selectionPeriodId: periodId,
    questionIds: [questionIds[1], questionIds[0]]
  })

  // Verify order - first two are swapped, third remains
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(3)
  expect(questions[0].questionId).toBe(questionIds[1])
  expect(questions[0].order).toBe(1)
  expect(questions[1].questionId).toBe(questionIds[0])
  expect(questions[1].order).toBe(2)
  // Third question keeps its original order value
  expect(questions[2].questionId).toBe(questionIds[2])

  vi.useRealTimers()
})

test("selectionQuestions: applyTemplate copies questions from template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-template"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, 3)
  const templateId = await createTestTemplate(t, semesterId, questionIds)

  // Apply template
  await t.mutation(api.selectionQuestions.applyTemplate, {
    selectionPeriodId: periodId,
    templateId
  })

  // Verify questions were copied
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(3)
  expect(questions.map(q => q.questionId).sort()).toEqual(questionIds.sort())
  expect(questions[0].sourceTemplateId).toBe(templateId)
  expect(questions[1].sourceTemplateId).toBe(templateId)
  expect(questions[2].sourceTemplateId).toBe(templateId)

  vi.useRealTimers()
})

test("selectionQuestions: applyTemplate preserves template order", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-template-order"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, 3)
  const templateId = await createTestTemplate(t, semesterId, questionIds)

  // Apply template
  await t.mutation(api.selectionQuestions.applyTemplate, {
    selectionPeriodId: periodId,
    templateId
  })

  // Verify order matches template order
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions.map(q => q.questionId)).toEqual(questionIds)
  expect(questions[0].order).toBe(1)
  expect(questions[1].order).toBe(2)
  expect(questions[2].order).toBe(3)

  vi.useRealTimers()
})

test("selectionQuestions: applyTemplate appends to existing questions", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-template-append"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const allQuestionIds = await createTestQuestions(t, semesterId, 5)

  // Add first two questions manually
  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId: allQuestionIds[0]
  })
  await t.mutation(api.selectionQuestions.addQuestion, {
    selectionPeriodId: periodId,
    questionId: allQuestionIds[1]
  })

  // Create template with last three questions
  const templateQuestionIds = [allQuestionIds[2], allQuestionIds[3], allQuestionIds[4]]
  const templateId = await createTestTemplate(t, semesterId, templateQuestionIds)

  // Apply template
  await t.mutation(api.selectionQuestions.applyTemplate, {
    selectionPeriodId: periodId,
    templateId
  })

  // Verify all questions are present with correct order
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })

  expect(questions).toHaveLength(5)
  expect(questions[0].questionId).toBe(allQuestionIds[0])
  expect(questions[0].order).toBe(1)
  expect(questions[0].sourceTemplateId).toBeUndefined()

  expect(questions[1].questionId).toBe(allQuestionIds[1])
  expect(questions[1].order).toBe(2)
  expect(questions[1].sourceTemplateId).toBeUndefined()

  expect(questions[2].questionId).toBe(allQuestionIds[2])
  expect(questions[2].order).toBe(3)
  expect(questions[2].sourceTemplateId).toBe(templateId)

  expect(questions[3].questionId).toBe(allQuestionIds[3])
  expect(questions[3].order).toBe(4)
  expect(questions[3].sourceTemplateId).toBe(templateId)

  expect(questions[4].questionId).toBe(allQuestionIds[4])
  expect(questions[4].order).toBe(5)
  expect(questions[4].sourceTemplateId).toBe(templateId)

  vi.useRealTimers()
})

test("selectionQuestions: applyTemplate with empty template does nothing", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

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
  const questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(0)

  vi.useRealTimers()
})

test("selectionQuestions: complex workflow with add, remove, reorder, and template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semesterId = "2024-test-complex"
  const periodId = await createTestSelectionPeriod(t, semesterId)
  const questionIds = await createTestQuestions(t, semesterId, 6)

  // Step 1: Add first three questions manually
  for (let i = 0; i < 3; i++) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: periodId,
      questionId: questionIds[i]
    })
  }

  let questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(3)

  // Step 2: Remove the second question
  await t.mutation(api.selectionQuestions.removeQuestion, {
    selectionPeriodId: periodId,
    questionId: questionIds[1]
  })

  questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(2)
  expect(questions.map(q => q.questionId)).toEqual([questionIds[0], questionIds[2]])

  // Step 3: Apply template with last three questions
  const templateQuestionIds = [questionIds[3], questionIds[4], questionIds[5]]
  const templateId = await createTestTemplate(t, semesterId, templateQuestionIds)

  await t.mutation(api.selectionQuestions.applyTemplate, {
    selectionPeriodId: periodId,
    templateId
  })

  questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(5)

  // Step 4: Reorder all questions
  const newOrder = [
    questionIds[5], // template question
    questionIds[0], // manual question
    questionIds[3], // template question
    questionIds[2], // manual question
    questionIds[4]  // template question
  ]

  await t.mutation(api.selectionQuestions.reorder, {
    selectionPeriodId: periodId,
    questionIds: newOrder
  })

  // Verify final state
  questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: periodId
  })
  expect(questions).toHaveLength(5)
  expect(questions.map(q => q.questionId)).toEqual(newOrder)

  // Verify sourceTemplateId is preserved after reordering
  expect(questions[0].sourceTemplateId).toBe(templateId) // questionIds[5]
  expect(questions[1].sourceTemplateId).toBeUndefined() // questionIds[0]
  expect(questions[2].sourceTemplateId).toBe(templateId) // questionIds[3]
  expect(questions[3].sourceTemplateId).toBeUndefined() // questionIds[2]
  expect(questions[4].sourceTemplateId).toBe(templateId) // questionIds[4]

  vi.useRealTimers()
})

test("selectionQuestions: multiple selection periods can have different questions", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("../**/*.*s"))

  const semester1 = "2024-fall"
  const semester2 = "2024-spring"

  const period1Id = await createTestSelectionPeriod(t, semester1)
  const period2Id = await createTestSelectionPeriod(t, semester2)

  const questions1 = await createTestQuestions(t, semester1, 2)
  const questions2 = await createTestQuestions(t, semester2, 3)

  // Add questions to first period
  for (const questionId of questions1) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: period1Id,
      questionId
    })
  }

  // Add questions to second period
  for (const questionId of questions2) {
    await t.mutation(api.selectionQuestions.addQuestion, {
      selectionPeriodId: period2Id,
      questionId
    })
  }

  // Verify each period has its own questions
  const period1Questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: period1Id
  })
  const period2Questions = await t.query(api.selectionQuestions.getQuestionsForPeriod, {
    selectionPeriodId: period2Id
  })

  expect(period1Questions).toHaveLength(2)
  expect(period2Questions).toHaveLength(3)
  expect(period1Questions.map(q => q.questionId)).toEqual(questions1)
  expect(period2Questions.map(q => q.questionId)).toEqual(questions2)

  vi.useRealTimers()
})
