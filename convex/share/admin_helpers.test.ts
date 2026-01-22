import { describe, it, expect } from "vitest"
import { generateTestStudents } from "./admin_helpers"
import type { Id } from "../_generated/dataModel"

describe("generateTestStudents", () => {
  it("should generate correct number of students", () => {
    const topicIds = ["topic1", "topic2", "topic3"] as Id<"topics">[]
    const numStudents = 5
    const result = generateTestStudents(topicIds, numStudents)

    console.log("Result:", result)
    expect(result).toHaveLength(numStudents)
  })

  it("should generate students with valid structure", () => {
    const topicIds = ["topic1", "topic2", "topic3"] as Id<"topics">[]
    const numStudents = 3
    const result = generateTestStudents(topicIds, numStudents)

    result.forEach((student, index) => {
      expect(student).toHaveProperty("id")
      expect(student.id).toBe(`student-${index + 1}`)
      expect(student).toHaveProperty("topics")
      expect(Array.isArray(student.topics)).toBe(true)
      expect(student.topics.length).toBeGreaterThan(0)
      expect(student.topics.length).toBeLessThanOrEqual(topicIds.length)
    })
  })

  it("should not have undefined values in topics", () => {
    const topicIds = ["topic1", "topic2", "topic3", "topic4", "topic5"] as Id<"topics">[]
    const numStudents = 10
    const result = generateTestStudents(topicIds, numStudents)

    result.forEach(student => {
      expect(student.topics).not.toContain(undefined)
      student.topics.forEach(topic => {
        expect(topic).toBeDefined()
        expect(topicIds).toContain(topic)
      })
    })
  })

  it("should handle empty topic array", () => {
    const topicIds: Id<"topics">[] = []
    const numStudents = 3
    const result = generateTestStudents(topicIds, numStudents)

    expect(result).toHaveLength(numStudents)
    result.forEach(student => {
      expect(student.topics).toHaveLength(0)
    })
  })
})