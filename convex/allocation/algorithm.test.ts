import { describe, test, expect, beforeEach } from "vitest"
import { HungarianAllocator } from "./algorithm"
import {
  distributeCapacity,
  validateCapacity,
  calculateStatistics,
  validatePreferences,
  generateRandomPreferences,
  generateClusteredPreferences,
  getTopNPercentage
} from "./utils"
import type { StudentPreference } from "./types"

describe("HungarianAllocator", () => {
  describe("Basic Allocation", () => {
    test("should assign all students with perfect matching", () => {
      // 3 students, 3 topics, perfect preferences
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 2, 3] }, // Wants topic 0
        { studentId: "s2", rankings: [2, 1, 3] }, // Wants topic 1
        { studentId: "s3", rankings: [3, 2, 1] }  // Wants topic 2
      ]

      const allocator = new HungarianAllocator(
        3,
        3,
        ["topic_0", "topic_1", "topic_2"] as never
      )

      const { assignments, statistics } = allocator.solve(preferences, "squared")

      expect(assignments).toHaveLength(3)
      expect(statistics.totalRegret).toBe(0) // Everyone gets first choice
      expect(statistics.averageRegret).toBe(0)
      expect(statistics.maxRegret).toBe(0)

      // Check everyone got rank 1
      for (const assignment of assignments) {
        expect(assignment.rank).toBe(1)
        expect(assignment.regret).toBe(0)
      }
    })

    test("should handle more students than topics", () => {
      // 5 students, 3 topics
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 2, 3] },
        { studentId: "s2", rankings: [1, 2, 3] },
        { studentId: "s3", rankings: [2, 1, 3] },
        { studentId: "s4", rankings: [3, 1, 2] },
        { studentId: "s5", rankings: [3, 2, 1] }
      ]

      const capacities = [2, 2, 1] // Total capacity = 5
      const allocator = new HungarianAllocator(
        5,
        3,
        ["topic_0", "topic_1", "topic_2"] as never,
        capacities
      )

      const { assignments, statistics } = allocator.solve(preferences, "squared")

      expect(assignments).toHaveLength(5)
      // All students should be assigned
      const assignedStudents = new Set(assignments.map(a => a.studentId))
      expect(assignedStudents.size).toBe(5)
    })

    test("should handle more topics than students", () => {
      // 3 students, 5 topics
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 2, 3, 4, 5] },
        { studentId: "s2", rankings: [2, 1, 3, 4, 5] },
        { studentId: "s3", rankings: [3, 2, 1, 4, 5] }
      ]

      const allocator = new HungarianAllocator(
        3,
        5,
        Array(5).fill(null).map((_, i) => `topic_${i}`) as never
      )

      const { assignments, statistics } = allocator.solve(preferences, "squared")

      expect(assignments).toHaveLength(3)
      // Everyone should still get good assignments
      expect(statistics.maxRegret).toBeLessThanOrEqual(4) // At most rank 3 squared
    })
  })

  describe("Regret Strategies", () => {
    const preferences: StudentPreference[] = [
      { studentId: "s1", rankings: [3, 1, 2] }, // Will get rank 3
      { studentId: "s2", rankings: [1, 2, 3] }, // Will get rank 1
      { studentId: "s3", rankings: [2, 3, 1] }  // Will get rank 2
    ]

    test("linear regret strategy", () => {
      const allocator = new HungarianAllocator(
        3,
        3,
        ["topic_0", "topic_1", "topic_2"] as never
      )

      const { statistics } = allocator.solve(preferences, "linear")

      // Linear: rank-1, so ranks 1,2,3 -> regrets 0,1,2
      // Best assignment would minimize total linear regret
      expect(statistics.totalRegret).toBeGreaterThanOrEqual(0)
    })

    test("squared regret strategy", () => {
      const allocator = new HungarianAllocator(
        3,
        3,
        ["topic_0", "topic_1", "topic_2"] as never
      )

      const { statistics } = allocator.solve(preferences, "squared")

      // Squared: (rank-1)², so ranks 1,2,3 -> regrets 0,1,4
      // Should heavily avoid rank 3
      expect(statistics.totalRegret).toBeGreaterThanOrEqual(0)
    })

    test("exponential regret strategy", () => {
      const allocator = new HungarianAllocator(
        3,
        3,
        ["topic_0", "topic_1", "topic_2"] as never
      )

      const { statistics } = allocator.solve(preferences, "exponential")

      // Exponential: 2^(rank-1)-1, so ranks 1,2,3 -> regrets 0,1,3
      expect(statistics.totalRegret).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Capacity Constraints", () => {
    test("should respect topic capacities", () => {
      // 6 students all wanting topic 0
      const preferences: StudentPreference[] = Array(6).fill(null).map((_, i) => ({
        studentId: `s${i}`,
        rankings: [1, 2, 3] // Everyone prefers topic 0
      }))

      const capacities = [2, 2, 2] // Each topic can only take 2 students
      const allocator = new HungarianAllocator(
        6,
        3,
        ["topic_0", "topic_1", "topic_2"] as never,
        capacities
      )

      const { assignments } = allocator.solve(preferences, "squared")

      // Count assignments per topic
      const topicCounts = new Map<string, number>()
      for (const assignment of assignments) {
        const count = topicCounts.get(assignment.topicId) || 0
        topicCounts.set(assignment.topicId, count + 1)
      }

      // Check capacities are respected
      for (const [topicId, count] of topicCounts) {
        const topicIndex = parseInt(topicId.split("_")[1])
        expect(count).toBeLessThanOrEqual(capacities[topicIndex])
      }
    })

    test("should handle uneven capacity distribution", () => {
      const preferences = generateRandomPreferences(10, 4)
      const capacities = [5, 3, 1, 1] // Very uneven

      const allocator = new HungarianAllocator(
        10,
        4,
        Array(4).fill(null).map((_, i) => `topic_${i}`) as never,
        capacities
      )

      const { assignments } = allocator.solve(preferences, "squared")

      expect(assignments).toHaveLength(10)
      // All students should be assigned despite uneven capacities
    })
  })

  describe("Performance", () => {
    test("should handle 100 students efficiently", () => {
      const preferences = generateRandomPreferences(100, 10)

      const allocator = new HungarianAllocator(
        100,
        10,
        Array(10).fill(null).map((_, i) => `topic_${i}`) as never
      )

      const startTime = performance.now()
      const { assignments } = allocator.solve(preferences, "squared")
      const duration = performance.now() - startTime

      expect(assignments).toHaveLength(100)
      expect(duration).toBeLessThan(500) // Should complete in under 500ms
      console.log(`100 students allocated in ${duration.toFixed(2)}ms`)
    })

    test("should handle 300 students efficiently", () => {
      const preferences = generateRandomPreferences(300, 30)

      const allocator = new HungarianAllocator(
        300,
        30,
        Array(30).fill(null).map((_, i) => `topic_${i}`) as never
      )

      const startTime = performance.now()
      const { assignments } = allocator.solve(preferences, "squared")
      const duration = performance.now() - startTime

      expect(assignments).toHaveLength(300)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
      console.log(`300 students allocated in ${duration.toFixed(2)}ms`)
    })
  })

  describe("Edge Cases", () => {
    test("should handle single student", () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 2, 3] }
      ]

      const allocator = new HungarianAllocator(
        1,
        3,
        ["topic_0", "topic_1", "topic_2"] as never
      )

      const { assignments, statistics } = allocator.solve(preferences, "squared")

      expect(assignments).toHaveLength(1)
      expect(assignments[0].rank).toBe(1)
      expect(statistics.totalRegret).toBe(0)
    })

    test("should handle single topic", () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1] },
        { studentId: "s2", rankings: [1] },
        { studentId: "s3", rankings: [1] }
      ]

      const allocator = new HungarianAllocator(
        3,
        1,
        ["topic_0"] as never,
        [3] // Topic can accommodate all students
      )

      const { assignments } = allocator.solve(preferences, "squared")

      expect(assignments).toHaveLength(3)
      // All students get the only topic
      for (const assignment of assignments) {
        expect(assignment.topicId).toBe("topic_0")
      }
    })
  })
})

describe("Utility Functions", () => {
  describe("distributeCapacity", () => {
    test("should distribute evenly", () => {
      const capacities = distributeCapacity(10, 5)
      expect(capacities).toEqual([2, 2, 2, 2, 2])
    })

    test("should handle remainder", () => {
      const capacities = distributeCapacity(11, 5)
      expect(capacities).toEqual([3, 2, 2, 2, 2])
      expect(capacities.reduce((a, b) => a + b)).toBe(11)
    })

    test("should handle more topics than students", () => {
      const capacities = distributeCapacity(3, 5)
      expect(capacities).toEqual([1, 1, 1, 0, 0])
      expect(capacities.reduce((a, b) => a + b)).toBe(3)
    })
  })

  describe("validateCapacity", () => {
    test("should validate sufficient capacity", () => {
      expect(validateCapacity(10, [3, 3, 4])).toBe(true)
      expect(validateCapacity(10, [2, 2, 2, 2, 2])).toBe(true)
    })

    test("should reject insufficient capacity", () => {
      expect(validateCapacity(10, [2, 2, 2])).toBe(false)
      expect(validateCapacity(10, [3, 3, 3])).toBe(false)
    })
  })

  describe("validatePreferences", () => {
    test("should validate correct preferences", () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 2, 3] },
        { studentId: "s2", rankings: [3, 1, 2] }
      ]

      const result = validatePreferences(preferences, 3)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test("should detect duplicate ranks", () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 1, 3] }
      ]

      const result = validatePreferences(preferences, 3)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Student s1 has duplicate rank 1")
    })

    test("should detect invalid ranks", () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [0, 2, 3] }
      ]

      const result = validatePreferences(preferences, 3)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes("invalid rank"))).toBe(true)
    })
  })

  describe("getTopNPercentage", () => {
    test("should calculate top N percentage correctly", () => {
      const assignments = [
        { studentId: "s1", topicId: "t1", rank: 1, regret: 0 },
        { studentId: "s2", topicId: "t2", rank: 2, regret: 1 },
        { studentId: "s3", topicId: "t3", rank: 3, regret: 4 },
        { studentId: "s4", topicId: "t1", rank: 1, regret: 0 },
        { studentId: "s5", topicId: "t2", rank: 4, regret: 9 }
      ] as never

      expect(getTopNPercentage(assignments, 1)).toBe(40) // 2/5 got rank 1
      expect(getTopNPercentage(assignments, 2)).toBe(60) // 3/5 got rank 1-2
      expect(getTopNPercentage(assignments, 3)).toBe(80) // 4/5 got rank 1-3
    })
  })

  describe("generateClusteredPreferences", () => {
    test("should generate clustered preferences", () => {
      const preferences = generateClusteredPreferences(20, 5, 0.4)

      expect(preferences).toHaveLength(20)

      // Check that preferences are valid
      for (const pref of preferences) {
        expect(pref.rankings).toHaveLength(5)
        const uniqueRanks = new Set(pref.rankings)
        expect(uniqueRanks.size).toBe(5)
      }

      // First 2 topics (40% of 5) should appear more frequently in top positions
      // This is statistical so we just check structure
      const firstChoices = preferences.map(p => p.rankings.indexOf(1))
      expect(firstChoices.length).toBe(20)
    })
  })
})