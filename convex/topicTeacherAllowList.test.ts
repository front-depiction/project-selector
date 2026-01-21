/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

async function createTestTopic(t: ReturnType<typeof convexTest>) {
  const semesterId = "2024-spring"
  
  return await t.run(async (ctx: any) => {
    return await ctx.db.insert("topics", {
      title: "Test Topic",
      description: "Test description",
      semesterId,
      isActive: true
    })
  })
}

test("topicTeacherAllowList: addTeacherEmail adds teacher to topic", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  const entryId = await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "teacher@example.com",
    note: "Primary instructor"
  })

  expect(entryId).toBeDefined()

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers.length).toBe(1)
  expect(teachers[0].email).toBe("teacher@example.com")
  expect(teachers[0].note).toBe("Primary instructor")

  vi.useRealTimers()
})

test("topicTeacherAllowList: addTeacherEmail normalizes email", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "  Teacher@Example.COM  "
  })

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers[0].email).toBe("teacher@example.com")

  vi.useRealTimers()
})

test("topicTeacherAllowList: addTeacherEmail updates existing entry", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  const entryId1 = await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "teacher@example.com",
    note: "Original note"
  })

  const entryId2 = await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "teacher@example.com",
    note: "Updated note"
  })

  expect(entryId1).toBe(entryId2) // Same entry ID

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers.length).toBe(1)
  expect(teachers[0].note).toBe("Updated note")

  vi.useRealTimers()
})

test("topicTeacherAllowList: addTeacherEmail rejects empty email", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await expect(
    t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
      topicId,
      email: "   "
    })
  ).rejects.toThrow("Email cannot be empty")

  vi.useRealTimers()
})

test("topicTeacherAllowList: bulkAddTeacherEmails adds multiple teachers", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  const result = await t.mutation(api.topicTeacherAllowList.bulkAddTeacherEmails, {
    topicId,
    emails: ["teacher1@example.com", "teacher2@example.com", "teacher3@example.com"],
    note: "Co-instructors"
  })

  expect(result.added).toBe(3)
  expect(result.updated).toBe(0)
  expect(result.skipped).toBe(0)

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers.length).toBe(3)

  vi.useRealTimers()
})

test("topicTeacherAllowList: bulkAddTeacherEmails skips invalid emails", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  const result = await t.mutation(api.topicTeacherAllowList.bulkAddTeacherEmails, {
    topicId,
    emails: ["valid@example.com", "invalid-email", "", "  ", "also@valid.com"]
  })

  expect(result.added).toBe(2)
  expect(result.skipped).toBe(3)

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers.length).toBe(2)

  vi.useRealTimers()
})

test("topicTeacherAllowList: removeTeacherEmail removes teacher", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "teacher@example.com"
  })

  const result = await t.mutation(api.topicTeacherAllowList.removeTeacherEmail, {
    topicId,
    email: "teacher@example.com"
  })

  expect(result.success).toBe(true)

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers.length).toBe(0)

  vi.useRealTimers()
})

test("topicTeacherAllowList: clearAllTeachers removes all teachers", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await t.mutation(api.topicTeacherAllowList.bulkAddTeacherEmails, {
    topicId,
    emails: ["teacher1@example.com", "teacher2@example.com", "teacher3@example.com"]
  })

  const result = await t.mutation(api.topicTeacherAllowList.clearAllTeachers, {
    topicId
  })

  expect(result.deleted).toBe(3)

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })
  expect(teachers.length).toBe(0)

  vi.useRealTimers()
})

test("topicTeacherAllowList: getTopicTeachers returns all teachers", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await t.mutation(api.topicTeacherAllowList.bulkAddTeacherEmails, {
    topicId,
    emails: ["teacher1@example.com", "teacher2@example.com"]
  })

  const teachers = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId })

  expect(teachers.length).toBe(2)
  const emails = teachers.map(t => t.email).sort()
  expect(emails).toEqual(["teacher1@example.com", "teacher2@example.com"])

  vi.useRealTimers()
})

test("topicTeacherAllowList: checkTeacherAccess validates access", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "teacher@example.com"
  })

  const hasAccess = await t.query(api.topicTeacherAllowList.checkTeacherAccess, {
    topicId,
    email: "teacher@example.com"
  })

  expect(hasAccess).toBe(true)

  const noAccess = await t.query(api.topicTeacherAllowList.checkTeacherAccess, {
    topicId,
    email: "other@example.com"
  })

  expect(noAccess).toBe(false)

  vi.useRealTimers()
})

test("topicTeacherAllowList: checkTeacherAccess is case insensitive", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId,
    email: "Teacher@Example.com"
  })

  const hasAccess = await t.query(api.topicTeacherAllowList.checkTeacherAccess, {
    topicId,
    email: "TEACHER@EXAMPLE.COM"
  })

  expect(hasAccess).toBe(true)

  vi.useRealTimers()
})

test("topicTeacherAllowList: getTeacherAllowListCount returns correct count", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId = await createTestTopic(t)

  expect(await t.query(api.topicTeacherAllowList.getTeacherAllowListCount, { topicId })).toBe(0)

  await t.mutation(api.topicTeacherAllowList.bulkAddTeacherEmails, {
    topicId,
    emails: ["teacher1@example.com", "teacher2@example.com"]
  })

  expect(await t.query(api.topicTeacherAllowList.getTeacherAllowListCount, { topicId })).toBe(2)

  vi.useRealTimers()
})

test("topicTeacherAllowList: integration - multiple topics with different teachers", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const topicId1 = await createTestTopic(t)
  
  const semesterId = "2024-spring"
  const topicId2 = await t.run(async (ctx: any) => {
    return await ctx.db.insert("topics", {
      title: "Topic 2",
      description: "Test",
      semesterId,
      isActive: true
    })
  })

  await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId: topicId1,
    email: "teacher1@example.com"
  })

  await t.mutation(api.topicTeacherAllowList.addTeacherEmail, {
    topicId: topicId2,
    email: "teacher2@example.com"
  })

  const teachers1 = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId: topicId1 })
  const teachers2 = await t.query(api.topicTeacherAllowList.getTopicTeachers, { topicId: topicId2 })

  expect(teachers1.length).toBe(1)
  expect(teachers2.length).toBe(1)
  expect(teachers1[0].email).toBe("teacher1@example.com")
  expect(teachers2[0].email).toBe("teacher2@example.com")

  vi.useRealTimers()
})
