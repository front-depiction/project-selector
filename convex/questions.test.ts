/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

/**
 * Helper to create a test question in the database.
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 */
async function createTestQuestion(
  t: ReturnType<typeof convexTest>,
  params: {
    question: string
    kind: "boolean" | "0to6"
    semesterId: string
    characteristicName?: string
  }
): Promise<Id<"questions">> {
  return await t.mutation(api.questions.createQuestion, {
    ...params,
    characteristicName: params.characteristicName ?? "Test Category"
  })
}

test("getAllQuestions: returns all questions when no semesterId filter", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create questions in different semesters
  const semesterId1 = "2024-spring"
  const semesterId2 = "2024-fall"

  await createTestQuestion(t, {
    question: "Do you enjoy teamwork?",
    kind: "boolean",
    semesterId: semesterId1
  })

  await createTestQuestion(t, {
    question: "Rate your interest in AI",
    kind: "0to6",
    semesterId: semesterId2
  })

  await createTestQuestion(t, {
    question: "Do you prefer remote work?",
    kind: "boolean",
    semesterId: semesterId1
  })

  // Get all questions without filter
  const allQuestions = await t.query(api.questions.getAllQuestions, {})

  expect(allQuestions).toBeDefined()
  expect(allQuestions.length).toBe(3)

  // Verify questions from both semesters are included
  const semesters = allQuestions.map(q => q.semesterId)
  expect(semesters).toContain(semesterId1)
  expect(semesters).toContain(semesterId2)

  vi.useRealTimers()
})

test("getAllQuestions: filters by semesterId when provided", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId1 = "2024-spring"
  const semesterId2 = "2024-fall"

  // Create questions in different semesters
  await createTestQuestion(t, {
    question: "Do you enjoy teamwork?",
    kind: "boolean",
    semesterId: semesterId1
  })

  await createTestQuestion(t, {
    question: "Rate your interest in AI",
    kind: "0to6",
    semesterId: semesterId2
  })

  await createTestQuestion(t, {
    question: "Do you prefer remote work?",
    kind: "boolean",
    semesterId: semesterId1
  })

  // Get questions filtered by semester
  const springQuestions = await t.query(api.questions.getAllQuestions, {
    semesterId: semesterId1
  })

  expect(springQuestions).toBeDefined()
  expect(springQuestions.length).toBe(2)

  // Verify all returned questions belong to the correct semester
  springQuestions.forEach(q => {
    expect(q.semesterId).toBe(semesterId1)
  })

  // Get questions for the other semester
  const fallQuestions = await t.query(api.questions.getAllQuestions, {
    semesterId: semesterId2
  })

  expect(fallQuestions).toBeDefined()
  expect(fallQuestions.length).toBe(1)
  expect(fallQuestions[0].semesterId).toBe(semesterId2)

  vi.useRealTimers()
})

test("getAllQuestions: returns empty array for non-existent semester", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  await createTestQuestion(t, {
    question: "Do you enjoy teamwork?",
    kind: "boolean",
    semesterId: "2024-spring"
  })

  // Query for non-existent semester
  const questions = await t.query(api.questions.getAllQuestions, {
    semesterId: "non-existent-semester"
  })

  expect(questions).toBeDefined()
  expect(questions.length).toBe(0)

  vi.useRealTimers()
})

test("createQuestion: creates boolean question with correct structure", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const questionText = "Do you enjoy working in teams?"

  // Create boolean question
  const questionId = await createTestQuestion(t, {
    question: questionText,
    kind: "boolean",
    semesterId
  })

  expect(questionId).toBeDefined()

  // Retrieve and verify the question
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(questions.length).toBe(1)

  const question = questions[0]
  expect(question._id).toBe(questionId)
  expect(question.question).toBe(questionText)
  expect(question.kind).toBe("boolean")
  expect(question.semesterId).toBe(semesterId)
  expect(question.createdAt).toBeDefined()
  expect(typeof question.createdAt).toBe("number")
  expect(question.createdAt).toBeGreaterThan(0)

  vi.useRealTimers()
})

test("createQuestion: creates 0to6 question with correct structure", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-fall"
  const questionText = "Rate your interest in machine learning"

  // Create 0to10 question
  const questionId = await createTestQuestion(t, {
    question: questionText,
    kind: "0to6",
    semesterId
  })

  expect(questionId).toBeDefined()

  // Retrieve and verify the question
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(questions.length).toBe(1)

  const question = questions[0]
  expect(question._id).toBe(questionId)
  expect(question.question).toBe(questionText)
  expect(question.kind).toBe("0to6")
  expect(question.semesterId).toBe(semesterId)
  expect(question.createdAt).toBeDefined()
  expect(typeof question.createdAt).toBe("number")

  vi.useRealTimers()
})

test("createQuestion: creates multiple questions with different kinds", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create multiple questions of different types
  const booleanId = await createTestQuestion(t, {
    question: "Do you enjoy teamwork?",
    kind: "boolean",
    semesterId
  })

  const ratingId = await createTestQuestion(t, {
    question: "Rate your interest in AI",
    kind: "0to6",
    semesterId
  })

  const anotherBooleanId = await createTestQuestion(t, {
    question: "Are you a morning person?",
    kind: "boolean",
    semesterId
  })

  expect(booleanId).toBeDefined()
  expect(ratingId).toBeDefined()
  expect(anotherBooleanId).toBeDefined()

  // Retrieve all questions
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(questions.length).toBe(3)

  // Verify both types are present
  const booleanQuestions = questions.filter(q => q.kind === "boolean")
  const ratingQuestions = questions.filter(q => q.kind === "0to6")

  expect(booleanQuestions.length).toBe(2)
  expect(ratingQuestions.length).toBe(1)

  vi.useRealTimers()
})

test("updateQuestion: updates question text only", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const originalQuestion = "Do you like coding?"
  const updatedQuestion = "Do you enjoy programming?"

  // Create question
  const questionId = await createTestQuestion(t, {
    question: originalQuestion,
    kind: "boolean",
    semesterId
  })

  // Update the question text
  await t.mutation(api.questions.updateQuestion, {
    id: questionId,
    question: updatedQuestion
  })

  // Verify the update
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(questions.length).toBe(1)

  const question = questions[0]
  expect(question.question).toBe(updatedQuestion)
  expect(question.kind).toBe("boolean") // Kind should remain unchanged
  expect(question.semesterId).toBe(semesterId) // Semester should remain unchanged

  vi.useRealTimers()
})

test("updateQuestion: updates question kind only", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const questionText = "How much do you like coding?"

  // Create question as boolean
  const questionId = await createTestQuestion(t, {
    question: questionText,
    kind: "boolean",
    semesterId
  })

  // Update to 0to6 kind
  await t.mutation(api.questions.updateQuestion, {
    id: questionId,
    kind: "0to6"
  })

  // Verify the update
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(questions.length).toBe(1)

  const question = questions[0]
  expect(question.question).toBe(questionText) // Text should remain unchanged
  expect(question.kind).toBe("0to6") // Kind should be updated

  vi.useRealTimers()
})

test("updateQuestion: updates both question text and kind", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create question
  const questionId = await createTestQuestion(t, {
    question: "Do you like coding?",
    kind: "boolean",
    semesterId
  })

  // Update both text and kind
  await t.mutation(api.questions.updateQuestion, {
    id: questionId,
    question: "Rate your interest in programming",
    kind: "0to6"
  })

  // Verify the update
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(questions.length).toBe(1)

  const question = questions[0]
  expect(question.question).toBe("Rate your interest in programming")
  expect(question.kind).toBe("0to6")
  expect(question.semesterId).toBe(semesterId)

  vi.useRealTimers()
})

test("updateQuestion: preserves createdAt timestamp", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create question
  const questionId = await createTestQuestion(t, {
    question: "Do you like coding?",
    kind: "boolean",
    semesterId
  })

  // Get original createdAt
  const originalQuestions = await t.query(api.questions.getAllQuestions, { semesterId })
  const originalCreatedAt = originalQuestions[0].createdAt

  // Update the question
  await t.mutation(api.questions.updateQuestion, {
    id: questionId,
    question: "Do you enjoy programming?"
  })

  // Verify createdAt is preserved
  const updatedQuestions = await t.query(api.questions.getAllQuestions, { semesterId })

  expect(updatedQuestions[0].createdAt).toBe(originalCreatedAt)

  vi.useRealTimers()
})

test("deleteQuestion: successfully deletes a question", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create question
  const questionId = await createTestQuestion(t, {
    question: "Do you like coding?",
    kind: "boolean",
    semesterId
  })

  // Verify question exists
  let questions = await t.query(api.questions.getAllQuestions, { semesterId })
  expect(questions.length).toBe(1)

  // Delete the question
  await t.mutation(api.questions.deleteQuestion, { id: questionId })

  // Verify question is deleted
  questions = await t.query(api.questions.getAllQuestions, { semesterId })
  expect(questions.length).toBe(0)

  vi.useRealTimers()
})

test("deleteQuestion: deletes only the specified question", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create multiple questions
  const questionId1 = await createTestQuestion(t, {
    question: "Do you like coding?",
    kind: "boolean",
    semesterId
  })

  const questionId2 = await createTestQuestion(t, {
    question: "Rate your interest in AI",
    kind: "0to6",
    semesterId
  })

  const questionId3 = await createTestQuestion(t, {
    question: "Do you prefer remote work?",
    kind: "boolean",
    semesterId
  })

  // Verify all questions exist
  let questions = await t.query(api.questions.getAllQuestions, { semesterId })
  expect(questions.length).toBe(3)

  // Delete one question
  await t.mutation(api.questions.deleteQuestion, { id: questionId2 })

  // Verify only the specified question is deleted
  questions = await t.query(api.questions.getAllQuestions, { semesterId })
  expect(questions.length).toBe(2)

  const remainingIds = questions.map(q => q._id)
  expect(remainingIds).toContain(questionId1)
  expect(remainingIds).not.toContain(questionId2)
  expect(remainingIds).toContain(questionId3)

  vi.useRealTimers()
})

test("questions: integration test covering full CRUD lifecycle", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // CREATE: Create initial questions
  const booleanQuestionId = await createTestQuestion(t, {
    question: "Do you enjoy teamwork?",
    kind: "boolean",
    semesterId
  })

  const ratingQuestionId = await createTestQuestion(t, {
    question: "Rate your interest in databases",
    kind: "0to6",
    semesterId
  })

  // READ: Verify both questions were created
  let questions = await t.query(api.questions.getAllQuestions, { semesterId })
  expect(questions.length).toBe(2)

  // UPDATE: Modify the boolean question
  await t.mutation(api.questions.updateQuestion, {
    id: booleanQuestionId,
    question: "Do you prefer working in teams?"
  })

  // READ: Verify the update
  questions = await t.query(api.questions.getAllQuestions, { semesterId })
  const updatedBooleanQuestion = questions.find(q => q._id === booleanQuestionId)
  expect(updatedBooleanQuestion?.question).toBe("Do you prefer working in teams?")

  // DELETE: Remove the rating question
  await t.mutation(api.questions.deleteQuestion, { id: ratingQuestionId })

  // READ: Verify deletion
  questions = await t.query(api.questions.getAllQuestions, { semesterId })
  expect(questions.length).toBe(1)
  expect(questions[0]._id).toBe(booleanQuestionId)

  vi.useRealTimers()
})

test("questions: handles questions across multiple semesters independently", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const spring2024 = "2024-spring"
  const fall2024 = "2024-fall"

  // Create questions in different semesters
  const springQ1 = await createTestQuestion(t, {
    question: "Spring question 1",
    kind: "boolean",
    semesterId: spring2024
  })

  const springQ2 = await createTestQuestion(t, {
    question: "Spring question 2",
    kind: "0to6",
    semesterId: spring2024
  })

  const fallQ1 = await createTestQuestion(t, {
    question: "Fall question 1",
    kind: "boolean",
    semesterId: fall2024
  })

  // Verify spring semester has 2 questions
  const springQuestions = await t.query(api.questions.getAllQuestions, {
    semesterId: spring2024
  })
  expect(springQuestions.length).toBe(2)

  // Verify fall semester has 1 question
  const fallQuestions = await t.query(api.questions.getAllQuestions, {
    semesterId: fall2024
  })
  expect(fallQuestions.length).toBe(1)

  // Delete a spring question
  await t.mutation(api.questions.deleteQuestion, { id: springQ1 })

  // Verify spring semester now has 1 question
  const updatedSpringQuestions = await t.query(api.questions.getAllQuestions, {
    semesterId: spring2024
  })
  expect(updatedSpringQuestions.length).toBe(1)

  // Verify fall semester is unchanged
  const unchangedFallQuestions = await t.query(api.questions.getAllQuestions, {
    semesterId: fall2024
  })
  expect(unchangedFallQuestions.length).toBe(1)

  vi.useRealTimers()
})

test("questions: Question.make helper sets createdAt automatically", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const beforeCreate = Date.now()

  // Create question (Question.make is called internally in createQuestion)
  const questionId = await createTestQuestion(t, {
    question: "Test question",
    kind: "boolean",
    semesterId
  })

  const afterCreate = Date.now()

  // Verify createdAt is set and within reasonable time range
  const questions = await t.query(api.questions.getAllQuestions, { semesterId })
  const question = questions[0]

  expect(question.createdAt).toBeDefined()
  expect(question.createdAt).toBeGreaterThanOrEqual(beforeCreate)
  expect(question.createdAt).toBeLessThanOrEqual(afterCreate)

  vi.useRealTimers()
})

test("questions: empty database returns empty array", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Query empty database
  const questions = await t.query(api.questions.getAllQuestions, {})

  expect(questions).toBeDefined()
  expect(Array.isArray(questions)).toBe(true)
  expect(questions.length).toBe(0)

  vi.useRealTimers()
})
