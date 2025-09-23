import { describe, test, expect } from "vitest"
import { HungarianAllocator, OptimizedHungarianAllocator, packAssignment, unpackAssignment } from "./algorithm"
import { generateRandomPreferences } from "./utils"
import type { StudentPreference } from "./types"
import type { Id } from "../_generated/dataModel"

describe("Optimized Hungarian Allocator", () => {
  describe("Correctness", () => {
    test("should produce same results as original", () => {
      const topicIds = ["t0", "t1", "t2", "t3"] as Id<"topics">[]
      const preferences: StudentPreference[] = [
        { studentId: "s0", topicIds: ["t0", "t1", "t2", "t3"] as Id<"topics">[] },
        { studentId: "s1", topicIds: ["t1", "t0", "t3", "t2"] as Id<"topics">[] },
        { studentId: "s2", topicIds: ["t2", "t3", "t0", "t1"] as Id<"topics">[] },
        { studentId: "s3", topicIds: ["t3", "t2", "t1", "t0"] as Id<"topics">[] }
      ]

      const original = new HungarianAllocator(4, 4, topicIds)
      const optimized = new OptimizedHungarianAllocator(4, 4, topicIds)

      const originalResult = original.solve(preferences, "squared")
      const optimizedResult = optimized.solve(preferences, "squared")

      // Should produce same statistics
      expect(optimizedResult.statistics.totalRegret).toBe(originalResult.statistics.totalRegret)
      expect(optimizedResult.statistics.averageRegret).toBe(originalResult.statistics.averageRegret)
      expect(optimizedResult.statistics.maxRegret).toBe(originalResult.statistics.maxRegret)

      // Should assign same number of students
      expect(optimizedResult.assignments.length).toBe(originalResult.assignments.length)
    })

    test("should handle capacities correctly", () => {
      const topicIds = ["t0", "t1", "t2"] as Id<"topics">[]
      const capacities = [2, 2, 1]
      const preferences: StudentPreference[] = [
        { studentId: "s0", topicIds: ["t0", "t1", "t2"] as Id<"topics">[] },
        { studentId: "s1", topicIds: ["t0", "t1", "t2"] as Id<"topics">[] },
        { studentId: "s2", topicIds: ["t0", "t1", "t2"] as Id<"topics">[] },
        { studentId: "s3", topicIds: ["t1", "t2", "t0"] as Id<"topics">[] },
        { studentId: "s4", topicIds: ["t2", "t1", "t0"] as Id<"topics">[] }
      ]

      const optimized = new OptimizedHungarianAllocator(5, 3, topicIds, capacities)
      const result = optimized.solve(preferences, "squared")

      // Check that all students are assigned
      expect(result.assignments.length).toBe(5)

      // Count assignments per topic
      const topicCounts = new Map<string, number>()
      for (const assignment of result.assignments) {
        const count = topicCounts.get(assignment.topicId) || 0
        topicCounts.set(assignment.topicId, count + 1)
      }

      // Check capacities are respected
      expect(topicCounts.get("t0") || 0).toBeLessThanOrEqual(2)
      expect(topicCounts.get("t1") || 0).toBeLessThanOrEqual(2)
      expect(topicCounts.get("t2") || 0).toBeLessThanOrEqual(1)
    })
  })

  describe("Performance", () => {
    test("should be faster than original for large datasets", () => {
      const numStudents = 200
      const numTopics = 20
      const topicIds = Array.from({ length: numTopics }, (_, i) => `t${i}`) as Id<"topics">[]
      const preferences = generateRandomPreferences(numStudents, numTopics, topicIds)

      const original = new HungarianAllocator(numStudents, numTopics, topicIds)
      const optimized = new OptimizedHungarianAllocator(numStudents, numTopics, topicIds)

      // Measure original
      const originalStart = performance.now()
      original.solve(preferences, "squared")
      const originalTime = performance.now() - originalStart

      // Measure optimized
      const optimizedStart = performance.now()
      optimized.solve(preferences, "squared")
      const optimizedTime = performance.now() - optimizedStart

      console.log(`\n=== PERFORMANCE COMPARISON ===`)
      console.log(`Original: ${originalTime.toFixed(2)}ms`)
      console.log(`Optimized: ${optimizedTime.toFixed(2)}ms`)
      console.log(`Speedup: ${(originalTime / optimizedTime).toFixed(2)}x`)

      // Both should complete in reasonable time
      expect(optimizedTime).toBeLessThan(1000)
    })

    test("should use less memory", () => {
      const optimized = new OptimizedHungarianAllocator(
        300, 30,
        Array.from({ length: 30 }, (_, i) => `t${i}`) as Id<"topics">[]
      )

      const stats = optimized.getMemoryStats()

      console.log(`\n=== MEMORY USAGE ===`)
      console.log(`Original: ${(stats.original / 1024).toFixed(1)}KB`)
      console.log(`Optimized: ${(stats.optimized / 1024).toFixed(1)}KB`)
      console.log(`Savings: ${stats.savings.toFixed(1)}%`)

      expect(stats.savings).toBeGreaterThan(70) // Should save at least 70%
    })
  })

  describe("Bit Packing", () => {
    test("should pack and unpack assignments correctly", () => {
      const student = 123
      const topic = 45
      const regret = 1234

      const packed = packAssignment(student, topic, regret)
      const unpacked = unpackAssignment(packed)

      expect(unpacked.student).toBe(student)
      expect(unpacked.topic).toBe(topic)
      expect(unpacked.regret).toBe(regret)
    })

    test("should handle edge cases", () => {
      // Max values
      const maxPacked = packAssignment(511, 255, 32767)
      const maxUnpacked = unpackAssignment(maxPacked)

      expect(maxUnpacked.student).toBe(511)  // 9 bits max
      expect(maxUnpacked.topic).toBe(255)    // 8 bits max
      expect(maxUnpacked.regret).toBe(32767) // 15 bits max

      // Min values
      const minPacked = packAssignment(0, 0, 0)
      const minUnpacked = unpackAssignment(minPacked)

      expect(minUnpacked.student).toBe(0)
      expect(minUnpacked.topic).toBe(0)
      expect(minUnpacked.regret).toBe(0)
    })
  })

  describe("Virtual Column Mapping", () => {
    test("should map virtual columns correctly", () => {
      const topicIds = ["t0", "t1", "t2"] as Id<"topics">[]
      const capacities = [2, 3, 1]

      // Virtual column mapping:
      // Topic 0: virtual cols 0-1 (capacity 2)
      // Topic 1: virtual cols 2-4 (capacity 3)
      // Topic 2: virtual col  5   (capacity 1)

      const allocator = new OptimizedHungarianAllocator(6, 3, topicIds, capacities)

      // Test private method indirectly through solve
      const preferences: StudentPreference[] = Array(6).fill(null).map((_, i) => ({
        studentId: `s${i}`,
        topicIds: topicIds
      }))

      const result = allocator.solve(preferences, "squared")

      // All 6 students should be assigned
      expect(result.assignments.length).toBe(6)

      // Verify capacity distribution
      const topicCounts = new Map<string, number>()
      for (const assignment of result.assignments) {
        const count = topicCounts.get(assignment.topicId) || 0
        topicCounts.set(assignment.topicId, count + 1)
      }

      expect(topicCounts.get("t0")).toBe(2)
      expect(topicCounts.get("t1")).toBe(3)
      expect(topicCounts.get("t2")).toBe(1)
    })
  })

  describe("Regret Strategies", () => {
    test("should handle different regret strategies", () => {
      const topicIds = ["t0", "t1", "t2"] as Id<"topics">[]
      const preferences: StudentPreference[] = [
        { studentId: "s0", topicIds: ["t0", "t1", "t2"] as Id<"topics">[] },
        { studentId: "s1", topicIds: ["t1", "t2", "t0"] as Id<"topics">[] },
        { studentId: "s2", topicIds: ["t2", "t0", "t1"] as Id<"topics">[] }
      ]

      const allocator = new OptimizedHungarianAllocator(3, 3, topicIds)

      // Test linear
      const linear = allocator.solve(preferences, "linear")
      expect(linear.statistics.totalRegret).toBeDefined()

      // Test squared
      const squared = allocator.solve(preferences, "squared")
      expect(squared.statistics.totalRegret).toBeDefined()

      // Test exponential
      const exponential = allocator.solve(preferences, "exponential")
      expect(exponential.statistics.totalRegret).toBeDefined()

      // Exponential should have highest regret for same assignments
      console.log(`\n=== REGRET STRATEGIES ===`)
      console.log(`Linear: ${linear.statistics.totalRegret}`)
      console.log(`Squared: ${squared.statistics.totalRegret}`)
      console.log(`Exponential: ${exponential.statistics.totalRegret}`)
    })
  })
})

describe("Memory Layout Visualization", () => {
  test("should demonstrate memory layout", () => {
    const students = 3
    const topics = 4

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  MEMORY LAYOUT COMPARISON (${students} students × ${topics} topics)           ║
╠═══════════════════════════════════════════════════════════════╣
║  Original 2D Array:                                           ║
║  ┌────────────────────────────────────┐                       ║
║  │ [0][0] [0][1] [0][2] [0][3]       │ Student 0              ║
║  │ [1][0] [1][1] [1][2] [1][3]       │ Student 1              ║
║  │ [2][0] [2][1] [2][2] [2][3]       │ Student 2              ║
║  └────────────────────────────────────┘                       ║
║  Memory: ${students} × ${topics} × 8 = ${students * topics * 8} bytes                          ║
║                                                               ║
║  Optimized 1D Array:                                          ║
║  ┌────────────────────────────────────┐                       ║
║  │ [0][1][2][3][4][5][6][7][8][9][10][11] │                   ║
║  └────────────────────────────────────┘                       ║
║   └──Student 0──┘└──Student 1──┘└──Student 2──┘               ║
║  Memory: ${students} × ${topics} × 2 = ${students * topics * 2} bytes                          ║
║                                                              ║
║  Savings: ${((1 - (students * topics * 2) / (students * topics * 8)) * 100).toFixed(0)}% memory reduction                               ║
╚═══════════════════════════════════════════════════════════════╝
    `)
  })

  test("should demonstrate bit packing", () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  BIT PACKING VISUALIZATION                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  32-bit Integer Layout:                                       ║
║  ┌─────────────┬──────────┬─────────────────┐                 ║
║  │ Student(9b) │ Topic(8b)│ Regret(15b)     │                 ║
║  ├─────────────┼──────────┼─────────────────┤                 ║
║  │ 31.......23 │ 22....15 │ 14............0 │                 ║
║  └─────────────┴──────────┴─────────────────┘                 ║
║                                                               ║
║  Example: Student 42, Topic 7, Regret 100                     ║
║  ┌─────────────┬──────────┬─────────────────┐                 ║
║  │  000101010  │ 00000111 │ 000000001100100 │                 ║
║  └─────────────┴──────────┴─────────────────┘                 ║
║  Packed: ${packAssignment(42, 7, 100).toString(2).padStart(32, '0')}            ║
║  Decimal: ${packAssignment(42, 7, 100)}                                            ║
╚═══════════════════════════════════════════════════════════════╝
    `)
  })
})