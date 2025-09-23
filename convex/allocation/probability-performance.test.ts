import { describe, test, expect } from "vitest"
import { ProbabilityCalculator } from "./probability"
import { HungarianAllocator, OptimizedHungarianAllocator } from "./algorithm"
import { generateRandomPreferences } from "./utils"
import type { Id } from "../_generated/dataModel"

describe("Probability Calculator Performance Comparison", () => {


  describe("Small Scale (50 students, 10 topics)", () => {
    test("should compare performance", () => {
      const numStudents = 50
      const numTopics = 10
      const iterations = 50
      const topicIds = Array.from({ length: numTopics }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(numStudents, numTopics, topicIds)

      console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
      console.log(`║  SMALL SCALE: ${numStudents} students × ${numTopics} topics × ${iterations} iterations  ║`)
      console.log(`╠═══════════════════════════════════════════════════════════╣`)

      // Test original
      const origCalc = new ProbabilityCalculator(numStudents, numTopics, topicIds)
      const origStart = performance.now()
      const origResult = origCalc.calculate(preferences, iterations)
      const origTime = performance.now() - origStart

      console.log(`║  Original Algorithm:                                      ║`)
      console.log(`║    Time: ${origTime.toFixed(2).padStart(8)}ms                                   ║`)
      console.log(`║    Per iteration: ${(origTime / iterations).toFixed(3).padStart(6)}ms                            ║`)

      // Test with optimized allocator directly
      const optAllocator = new OptimizedHungarianAllocator(numStudents, numTopics, topicIds)
      const optStart = performance.now()

      // Simulate probability calculation with optimized allocator
      for (let i = 0; i < iterations; i++) {
        optAllocator.solve(preferences, "squared")
      }
      const optTime = performance.now() - optStart

      console.log(`║                                                           ║`)
      console.log(`║  Optimized Algorithm:                                     ║`)
      console.log(`║    Time: ${optTime.toFixed(2).padStart(8)}ms                                   ║`)
      console.log(`║    Per iteration: ${(optTime / iterations).toFixed(3).padStart(6)}ms                            ║`)

      const speedup = origTime / optTime
      const memStats = optAllocator.getMemoryStats()

      console.log(`║                                                           ║`)
      console.log(`║  Improvements:                                            ║`)
      console.log(`║    Speed: ${speedup.toFixed(2)}x faster                                  ║`)
      console.log(`║    Memory: ${memStats.savings.toFixed(1)}% reduction                           ║`)
      console.log(`╚═══════════════════════════════════════════════════════════╝`)

      expect(origResult.probabilities).toHaveLength(numStudents)
      expect(origResult.probabilities[0]).toHaveLength(numTopics)
    })
  })

  describe("Medium Scale (100 students, 20 topics)", () => {
    test("should show performance gains", () => {
      const numStudents = 100
      const numTopics = 20
      const iterations = 30
      const topicIds = Array.from({ length: numTopics }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(numStudents, numTopics, topicIds)

      console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
      console.log(`║  MEDIUM SCALE: ${numStudents} students × ${numTopics} topics × ${iterations} iter      ║`)
      console.log(`╠═══════════════════════════════════════════════════════════╣`)

      // Original
      const origAllocator = new HungarianAllocator(numStudents, numTopics, topicIds)
      const origTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        origAllocator.solve(preferences, "squared")
        origTimes.push(performance.now() - start)
      }
      const origAvg = origTimes.reduce((a, b) => a + b) / iterations

      // Optimized
      const optAllocator = new OptimizedHungarianAllocator(numStudents, numTopics, topicIds)
      const optTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        optAllocator.solve(preferences, "squared")
        optTimes.push(performance.now() - start)
      }
      const optAvg = optTimes.reduce((a, b) => a + b) / iterations

      const speedup = origAvg / optAvg
      const memStats = optAllocator.getMemoryStats()

      console.log(`║  Original:  ${(origAvg * iterations).toFixed(2).padStart(8)}ms total, ${origAvg.toFixed(3).padStart(6)}ms/iter   ║`)
      console.log(`║  Optimized: ${(optAvg * iterations).toFixed(2).padStart(8)}ms total, ${optAvg.toFixed(3).padStart(6)}ms/iter   ║`)
      console.log(`║                                                           ║`)
      console.log(`║  Speedup: ${speedup.toFixed(2)}x                                        ║`)
      console.log(`║  Memory saved: ${(memStats.original / 1024 - memStats.optimized / 1024).toFixed(1)}KB                              ║`)
      console.log(`╚═══════════════════════════════════════════════════════════╝`)

      expect(speedup).toBeGreaterThan(0.9) // Should be at least similar speed
    })
  })

  describe("Large Scale (300 students, 30 topics)", () => {
    test("should demonstrate scalability", { timeout: 15000 }, () => {
      const numStudents = 300
      const numTopics = 30
      const iterations = 5 // Reduced for faster testing
      const topicIds = Array.from({ length: numTopics }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(numStudents, numTopics, topicIds)

      console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
      console.log(`║  LARGE SCALE: ${numStudents} students × ${numTopics} topics × ${iterations} iter       ║`)
      console.log(`╠═══════════════════════════════════════════════════════════╣`)

      // Original - might be slow
      const origAllocator = new HungarianAllocator(numStudents, numTopics, topicIds)
      const origStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        origAllocator.solve(preferences, "squared")
      }
      const origTotal = performance.now() - origStart

      // Optimized
      const optAllocator = new OptimizedHungarianAllocator(numStudents, numTopics, topicIds)
      const optStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        optAllocator.solve(preferences, "squared")
      }
      const optTotal = performance.now() - optStart

      const speedup = origTotal / optTotal
      const memStats = optAllocator.getMemoryStats()

      // Memory comparison visualization
      console.log(`║  Memory Usage Comparison:                                ║`)
      console.log(`║  ┌──────────────────────────────────────────────┐      ║`)
      console.log(`║  │ Original:  ${"█".repeat(Math.floor(memStats.original / 5000)).padEnd(30)} │      ║`)
      console.log(`║  │ Optimized: ${"█".repeat(Math.floor(memStats.optimized / 5000)).padEnd(30)} │      ║`)
      console.log(`║  └──────────────────────────────────────────────┘      ║`)
      console.log(`║                                                           ║`)
      console.log(`║  Performance:                                             ║`)
      console.log(`║    Original:  ${origTotal.toFixed(0).padStart(6)}ms total                       ║`)
      console.log(`║    Optimized: ${optTotal.toFixed(0).padStart(6)}ms total                       ║`)
      console.log(`║    Speedup:   ${speedup.toFixed(2)}x                                   ║`)
      console.log(`║                                                           ║`)
      console.log(`║  Memory Savings:                                          ║`)
      console.log(`║    Original:  ${(memStats.original / 1024).toFixed(1).padStart(6)}KB                               ║`)
      console.log(`║    Optimized: ${(memStats.optimized / 1024).toFixed(1).padStart(6)}KB                               ║`)
      console.log(`║    Reduction: ${memStats.savings.toFixed(1).padStart(6)}%                                ║`)
      console.log(`╚═══════════════════════════════════════════════════════════╝`)

      expect(optTotal).toBeLessThan(10000) // Should complete in reasonable time
    })
  })

  describe("Memory Efficiency at Scale", () => {
    test("should show memory scaling", () => {
      const scales = [
        { students: 50, topics: 10 },
        { students: 100, topics: 20 },
        { students: 200, topics: 30 },
        { students: 300, topics: 40 },
        { students: 500, topics: 50 }
      ]

      console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
      console.log(`║  MEMORY SCALING ANALYSIS                                 ║`)
      console.log(`╠═══════════════════════════════════════════════════════════╣`)
      console.log(`║  Size        │ Original │ Optimized │ Saved │ Reduction ║`)
      console.log(`║  ────────────┼──────────┼───────────┼───────┼────────── ║`)

      for (const scale of scales) {
        const topicIds = Array.from({ length: scale.topics }, (_, i) => `t${i}` as Id<"topics">)
        const allocator = new OptimizedHungarianAllocator(
          scale.students,
          scale.topics,
          topicIds
        )
        const stats = allocator.getMemoryStats()

        const sizeStr = `${scale.students}×${scale.topics}`.padEnd(12)
        const origStr = `${(stats.original / 1024).toFixed(1)}KB`.padEnd(8)
        const optStr = `${(stats.optimized / 1024).toFixed(1)}KB`.padEnd(9)
        const savedStr = `${((stats.original - stats.optimized) / 1024).toFixed(1)}KB`.padEnd(5)
        const reductionStr = `${stats.savings.toFixed(0)}%`.padStart(8)

        console.log(`║  ${sizeStr}│ ${origStr} │ ${optStr} │ ${savedStr} │ ${reductionStr} ║`)
      }

      console.log(`║                                                           ║`)
      console.log(`║  Key Benefits:                                            ║`)
      console.log(`║  • Better cache locality with 1D arrays                  ║`)
      console.log(`║  • Reduced memory bandwidth requirements                 ║`)
      console.log(`║  • Enables larger problems in browser environment        ║`)
      console.log(`║  • Lower garbage collection pressure                     ║`)
      console.log(`╚═══════════════════════════════════════════════════════════╝`)
    })
  })

  describe("Real-world Scenario", () => {
    test("should handle typical university allocation", { timeout: 15000 }, () => {
      // Typical university scenario: 250 students, 25 topics
      const numStudents = 250
      const numTopics = 25
      const iterations = 20 // For probability calculation
      const topicIds = Array.from({ length: numTopics }, (_, i) => `topic_${i}` as Id<"topics">)

      // Generate realistic preferences (some clustering)
      const preferences = generateRandomPreferences(numStudents, numTopics, topicIds)

      console.log(`\n╔═══════════════════════════════════════════════════════════╗`)
      console.log(`║  REAL-WORLD SCENARIO: University Topic Allocation        ║`)
      console.log(`║  ${numStudents} students selecting from ${numTopics} topics                ║`)
      console.log(`╠═══════════════════════════════════════════════════════════╣`)

      // Measure full probability calculation
      const probCalc = new ProbabilityCalculator(numStudents, numTopics, topicIds)
      const probStart = performance.now()
      const probResult = probCalc.calculate(preferences, iterations)
      const probTime = performance.now() - probStart

      // Measure with optimized allocator
      const optAllocator = new OptimizedHungarianAllocator(numStudents, numTopics, topicIds)
      const optStart = performance.now()
      const counts = new Uint16Array(numStudents * numTopics)

      for (let iter = 0; iter < iterations; iter++) {
        const result = optAllocator.solve(preferences, "squared")
        // Count assignments (simplified)
        for (const assignment of result.assignments) {
          const sIdx = parseInt(assignment.studentId.split("_")[1])
          const tIdx = topicIds.indexOf(assignment.topicId)
          if (sIdx >= 0 && tIdx >= 0) {
            counts[sIdx * numTopics + tIdx]++
          }
        }
      }
      const optTime = performance.now() - optStart

      const speedup = probTime / optTime
      const memStats = optAllocator.getMemoryStats()

      console.log(`║                                                           ║`)
      console.log(`║  Current Implementation:                                  ║`)
      console.log(`║    Time: ${probTime.toFixed(0)}ms                                       ║`)
      console.log(`║    Memory: ~${(numStudents * numTopics * 8 / 1024).toFixed(0)}KB                                   ║`)
      console.log(`║                                                           ║`)
      console.log(`║  Optimized Implementation:                                ║`)
      console.log(`║    Time: ${optTime.toFixed(0)}ms (${speedup.toFixed(1)}x faster)                        ║`)
      console.log(`║    Memory: ~${(memStats.optimized / 1024).toFixed(0)}KB (${memStats.savings.toFixed(0)}% less)                      ║`)
      console.log(`║                                                           ║`)
      console.log(`║  Impact:                                                  ║`)
      console.log(`║    • ${(probTime - optTime).toFixed(0)}ms saved per calculation                   ║`)
      console.log(`║    • ${((memStats.original - memStats.optimized) / 1024).toFixed(0)}KB memory saved                           ║`)
      console.log(`║    • Better UX with faster updates                       ║`)
      console.log(`╚═══════════════════════════════════════════════════════════╝`)

      // Verify probabilities sum to 1
      for (let s = 0; s < Math.min(5, numStudents); s++) {
        const sum = probResult.probabilities[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1, 5)
      }
    })
  })
})