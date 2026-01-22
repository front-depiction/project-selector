/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

/**
 * Test suite for questionTemplates and templateQuestions functions.
 *
 * These tests cover:
 * - Template CRUD operations
 * - getTemplateWithQuestions (joining template with its questions)
 * - Adding/removing questions from templates
 * - Reordering questions in templates
 * - Junction table operations
 */

/**
 * Helper to create test questions for use in templates
 */
async function createTestQuestions(
  t: ReturnType<typeof convexTest>,
  semesterId: string,
  count: number = 3
): Promise<Id<"questions">[]> {
  const questionIds: Id<"questions">[] = []

  for (let i = 0; i < count; i++) {
    const id = await t.mutation(api.questions.createQuestion, {
      question: `Test question ${i + 1}`,
      kind: i % 2 === 0 ? "boolean" : "0to6",
      semesterId,
      characteristicName: "Test Category"
    })
    questionIds.push(id)
  }

  return questionIds
}

test("createTemplate: creates a new template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Student Feedback Survey",
    description: "End of semester feedback",
    semesterId
  })

  expect(templateId).toBeDefined()

  // Verify template was created
  const templates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(templates).toHaveLength(1)
  expect(templates[0]._id).toBe(templateId)
  expect(templates[0].title).toBe("Student Feedback Survey")
  expect(templates[0].description).toBe("End of semester feedback")
  expect(templates[0].semesterId).toBe(semesterId)
  expect(templates[0].createdAt).toBeDefined()

  vi.useRealTimers()
})

test("createTemplate: creates template without description", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-fall"
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Quick Survey",
    semesterId
  })

  expect(templateId).toBeDefined()

  const templates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(templates).toHaveLength(1)
  expect(templates[0].description).toBeUndefined()

  vi.useRealTimers()
})

test("getAllTemplates: returns all templates without filter", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create templates for different semesters
  await t.mutation(api.questionTemplates.createTemplate, {
    title: "Spring Survey",
    semesterId: "2024-spring"
  })
  await t.mutation(api.questionTemplates.createTemplate, {
    title: "Fall Survey",
    semesterId: "2024-fall"
  })

  const allTemplates = await t.query(api.questionTemplates.getAllTemplates, {})
  expect(allTemplates).toHaveLength(2)

  vi.useRealTimers()
})

test("getAllTemplates: filters templates by semester", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create templates for different semesters
  await t.mutation(api.questionTemplates.createTemplate, {
    title: "Spring Survey",
    semesterId: "2024-spring"
  })
  await t.mutation(api.questionTemplates.createTemplate, {
    title: "Fall Survey",
    semesterId: "2024-fall"
  })
  await t.mutation(api.questionTemplates.createTemplate, {
    title: "Another Spring Survey",
    semesterId: "2024-spring"
  })

  const springTemplates = await t.query(api.questionTemplates.getAllTemplates, {
    semesterId: "2024-spring"
  })
  expect(springTemplates).toHaveLength(2)
  springTemplates.forEach(t => expect(t.semesterId).toBe("2024-spring"))

  const fallTemplates = await t.query(api.questionTemplates.getAllTemplates, {
    semesterId: "2024-fall"
  })
  expect(fallTemplates).toHaveLength(1)
  expect(fallTemplates[0].title).toBe("Fall Survey")

  vi.useRealTimers()
})

test("updateTemplate: updates template title and description", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Original Title",
    description: "Original Description",
    semesterId
  })

  // Update both fields
  await t.mutation(api.questionTemplates.updateTemplate, {
    id: templateId,
    title: "Updated Title",
    description: "Updated Description"
  })

  const templates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(templates[0].title).toBe("Updated Title")
  expect(templates[0].description).toBe("Updated Description")

  vi.useRealTimers()
})

test("updateTemplate: updates only title", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Original Title",
    description: "Original Description",
    semesterId
  })

  await t.mutation(api.questionTemplates.updateTemplate, {
    id: templateId,
    title: "New Title"
  })

  const templates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(templates[0].title).toBe("New Title")
  expect(templates[0].description).toBe("Original Description")

  vi.useRealTimers()
})

test("updateTemplate: updates only description", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Original Title",
    description: "Original Description",
    semesterId
  })

  await t.mutation(api.questionTemplates.updateTemplate, {
    id: templateId,
    description: "New Description"
  })

  const templates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(templates[0].title).toBe("Original Title")
  expect(templates[0].description).toBe("New Description")

  vi.useRealTimers()
})

test("updateTemplate: throws error for non-existent template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create a real template, delete it, then try to update
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Temp Template",
    semesterId: "2024-spring"
  })
  await t.mutation(api.questionTemplates.deleteTemplate, { id: templateId })

  await expect(
    t.mutation(api.questionTemplates.updateTemplate, {
      id: templateId,
      title: "New Title"
    })
  ).rejects.toThrow("Template not found")

  vi.useRealTimers()
})

test("deleteTemplate: deletes template and all related template questions", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey to Delete",
    semesterId
  })

  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add questions to template
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Verify template questions exist
  const templateQuestionsBefore = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestionsBefore).toHaveLength(3)

  // Delete template
  const result = await t.mutation(api.questionTemplates.deleteTemplate, {
    id: templateId
  })
  expect(result.success).toBe(true)

  // Verify template is deleted
  const templates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(templates).toHaveLength(0)

  // Verify template questions are deleted
  const templateQuestionsAfter = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestionsAfter).toHaveLength(0)

  vi.useRealTimers()
})

test("deleteTemplate: throws error for non-existent template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create a real template, delete it, then try to delete again
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Temp Template",
    semesterId: "2024-spring"
  })
  await t.mutation(api.questionTemplates.deleteTemplate, { id: templateId })

  await expect(
    t.mutation(api.questionTemplates.deleteTemplate, { id: templateId })
  ).rejects.toThrow("Template not found")

  vi.useRealTimers()
})

test("getTemplateWithQuestions: returns template with empty questions array", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Empty Template",
    description: "No questions yet",
    semesterId
  })

  const result = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: templateId
  })

  expect(result).toBeDefined()
  expect(result).not.toBeNull()
  expect(result?.title).toBe("Empty Template")
  expect(result?.questions).toEqual([])

  vi.useRealTimers()
})

test("getTemplateWithQuestions: returns template with joined questions", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Full Survey",
    semesterId
  })

  // Create questions
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add questions to template
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  const result = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: templateId
  })

  expect(result).toBeDefined()
  expect(result).not.toBeNull()
  expect(result?.title).toBe("Full Survey")
  expect(result?.questions).toHaveLength(3)

  // Verify questions are valid
  result?.questions.forEach((q, idx) => {
    expect(q?._id).toBe(questionIds[idx])
    expect(q?.question).toContain("Test question")
    expect(q?.semesterId).toBe(semesterId)
  })

  vi.useRealTimers()
})

test("getTemplateWithQuestions: returns null for non-existent template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create a real template, delete it, then try to get it
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Temp Template",
    semesterId: "2024-spring"
  })
  await t.mutation(api.questionTemplates.deleteTemplate, { id: templateId })

  const result = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: templateId
  })

  expect(result).toBeNull()

  vi.useRealTimers()
})

test("addQuestion: adds question to template with correct order", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add first question
  const tq1 = await t.mutation(api.templateQuestions.addQuestion, {
    templateId,
    questionId: questionIds[0]
  })
  expect(tq1).toBeDefined()

  // Add second question
  const tq2 = await t.mutation(api.templateQuestions.addQuestion, {
    templateId,
    questionId: questionIds[1]
  })
  expect(tq2).toBeDefined()

  // Verify order
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(2)
  expect(templateQuestions[0].questionId).toBe(questionIds[0])
  expect(templateQuestions[0].order).toBe(1)
  expect(templateQuestions[1].questionId).toBe(questionIds[1])
  expect(templateQuestions[1].order).toBe(2)

  vi.useRealTimers()
})

test("addQuestion: order increments correctly for multiple questions", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 5)

  // Add all questions
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Verify order is sequential
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(5)
  templateQuestions.forEach((tq, idx) => {
    expect(tq.order).toBe(idx + 1)
    expect(tq.questionId).toBe(questionIds[idx])
  })

  vi.useRealTimers()
})

test("removeQuestion: removes question from template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add questions
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Remove middle question
  await t.mutation(api.templateQuestions.removeQuestion, {
    templateId,
    questionId: questionIds[1]
  })

  // Verify question was removed
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(2)
  expect(templateQuestions[0].questionId).toBe(questionIds[0])
  expect(templateQuestions[1].questionId).toBe(questionIds[2])

  vi.useRealTimers()
})

test("removeQuestion: does nothing for non-existent question", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 2)

  // Add questions
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Try to remove a question that's not in the template
  const [otherQuestionId] = await createTestQuestions(t, semesterId, 1)
  await t.mutation(api.templateQuestions.removeQuestion, {
    templateId,
    questionId: otherQuestionId
  })

  // Verify original questions are still there
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(2)

  vi.useRealTimers()
})

test("getQuestionsForTemplate: returns questions sorted by order", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 4)

  // Add questions
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })

  // Verify questions are sorted by order
  for (let i = 0; i < templateQuestions.length - 1; i++) {
    expect(templateQuestions[i].order).toBeLessThan(templateQuestions[i + 1].order)
  }

  vi.useRealTimers()
})

test("reorder: reorders questions in template", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 4)

  // Add questions in original order
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Reorder: reverse the questions
  const newOrder = [...questionIds].reverse()
  await t.mutation(api.templateQuestions.reorder, {
    templateId,
    questionIds: newOrder
  })

  // Verify new order
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(4)
  templateQuestions.forEach((tq, idx) => {
    expect(tq.questionId).toBe(newOrder[idx])
    expect(tq.order).toBe(idx + 1)
  })

  vi.useRealTimers()
})

test("reorder: handles partial reordering (subset of questions)", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 5)

  // Add questions
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Reorder with only 3 questions (removes the other 2)
  const newOrder = [questionIds[2], questionIds[0], questionIds[4]]
  await t.mutation(api.templateQuestions.reorder, {
    templateId,
    questionIds: newOrder
  })

  // Verify only the 3 questions remain in new order
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(3)
  expect(templateQuestions[0].questionId).toBe(questionIds[2])
  expect(templateQuestions[1].questionId).toBe(questionIds[0])
  expect(templateQuestions[2].questionId).toBe(questionIds[4])

  vi.useRealTimers()
})

test("reorder: handles empty array (removes all questions)", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create template and questions
  const templateId = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Survey",
    semesterId
  })
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Add questions
  for (const questionId of questionIds) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId,
      questionId
    })
  }

  // Reorder with empty array
  await t.mutation(api.templateQuestions.reorder, {
    templateId,
    questionIds: []
  })

  // Verify all questions are removed
  const templateQuestions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId
  })
  expect(templateQuestions).toHaveLength(0)

  vi.useRealTimers()
})

test("integration: complete workflow with multiple templates", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create questions pool
  const questionIds = await createTestQuestions(t, semesterId, 8)

  // Create two templates
  const template1Id = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Pre-course Survey",
    description: "Survey before course starts",
    semesterId
  })

  const template2Id = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Post-course Survey",
    description: "Survey after course ends",
    semesterId
  })

  // Add questions to first template
  for (let i = 0; i < 4; i++) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId: template1Id,
      questionId: questionIds[i]
    })
  }

  // Add questions to second template
  for (let i = 4; i < 8; i++) {
    await t.mutation(api.templateQuestions.addQuestion, {
      templateId: template2Id,
      questionId: questionIds[i]
    })
  }

  // Verify both templates
  const template1 = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: template1Id
  })
  expect(template1?.questions).toHaveLength(4)

  const template2 = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: template2Id
  })
  expect(template2?.questions).toHaveLength(4)

  // Update template 1
  await t.mutation(api.questionTemplates.updateTemplate, {
    id: template1Id,
    title: "Updated Pre-course Survey"
  })

  // Reorder questions in template 1
  const newOrder = [questionIds[3], questionIds[1], questionIds[0]]
  await t.mutation(api.templateQuestions.reorder, {
    templateId: template1Id,
    questionIds: newOrder
  })

  // Verify template 1 changes
  const updatedTemplate1 = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: template1Id
  })
  expect(updatedTemplate1?.title).toBe("Updated Pre-course Survey")
  expect(updatedTemplate1?.questions).toHaveLength(3)
  expect(updatedTemplate1?.questions[0]?._id).toBe(questionIds[3])

  // Verify template 2 is unaffected
  const unchangedTemplate2 = await t.query(api.questionTemplates.getTemplateWithQuestions, {
    id: template2Id
  })
  expect(unchangedTemplate2?.questions).toHaveLength(4)

  // Delete template 1
  await t.mutation(api.questionTemplates.deleteTemplate, {
    id: template1Id
  })

  // Verify only template 2 remains
  const allTemplates = await t.query(api.questionTemplates.getAllTemplates, { semesterId })
  expect(allTemplates).toHaveLength(1)
  expect(allTemplates[0]._id).toBe(template2Id)

  vi.useRealTimers()
})

test("integration: same question can be in multiple templates", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const semesterId = "2024-spring"

  // Create questions
  const questionIds = await createTestQuestions(t, semesterId, 3)

  // Create two templates
  const template1Id = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Template 1",
    semesterId
  })

  const template2Id = await t.mutation(api.questionTemplates.createTemplate, {
    title: "Template 2",
    semesterId
  })

  // Add same question to both templates
  await t.mutation(api.templateQuestions.addQuestion, {
    templateId: template1Id,
    questionId: questionIds[0]
  })

  await t.mutation(api.templateQuestions.addQuestion, {
    templateId: template2Id,
    questionId: questionIds[0]
  })

  // Verify question is in both templates
  const template1Questions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId: template1Id
  })
  expect(template1Questions).toHaveLength(1)
  expect(template1Questions[0].questionId).toBe(questionIds[0])

  const template2Questions = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId: template2Id
  })
  expect(template2Questions).toHaveLength(1)
  expect(template2Questions[0].questionId).toBe(questionIds[0])

  // Remove from one template shouldn't affect the other
  await t.mutation(api.templateQuestions.removeQuestion, {
    templateId: template1Id,
    questionId: questionIds[0]
  })

  const template1AfterRemove = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId: template1Id
  })
  expect(template1AfterRemove).toHaveLength(0)

  const template2AfterRemove = await t.query(api.templateQuestions.getQuestionsForTemplate, {
    templateId: template2Id
  })
  expect(template2AfterRemove).toHaveLength(1)

  vi.useRealTimers()
})
