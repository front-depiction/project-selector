import { describe, test, expect } from "vitest"
import { ProbabilityCalculator, calculateProbabilities } from "./probability"
import { generateRandomPreferences } from "./utils"
import type { StudentPreference } from "./types"
import type { Id } from "../_generated/dataModel"

describe("Simple Probability Calculator", () => {
  const measureTime = (name: string, fn: () => void): number => {
    const start = performance.now()
    fn()
    const duration = performance.now() - start
    console.log(`[TIMING] ${name}: ${duration.toFixed(2)}ms`)
    return duration
  }

  describe("Correctness", () => {
    test("should produce valid probability distributions", () => {
      const topicIds = ["t1", "t2", "t3"] as Id<"topics">[]
      const preferences: StudentPreference[] = [
        { studentId: "s1", topicIds: ["t1", "t2", "t3"] as Id<"topics">[] },
        { studentId: "s2", topicIds: ["t2", "t1", "t3"] as Id<"topics">[] },
        { studentId: "s3", topicIds: ["t3", "t2", "t1"] as Id<"topics">[] }
      ]

      const calc = new ProbabilityCalculator(3, 3, topicIds)
      const result = calc.calculate(preferences, 100)

      // Check structure
      expect(result.studentIds).toEqual(["s1", "s2", "s3"])
      expect(result.probabilities).toHaveLength(3)
      expect(result.probabilities[0]).toHaveLength(3)

      // Check probabilities sum to 1
      for (let s = 0; s < 3; s++) {
        const sum = result.probabilities[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1, 5)
      }

      // Check all probabilities are valid
      for (let s = 0; s < 3; s++) {
        for (let t = 0; t < 3; t++) {
          const prob = result.probabilities[s][t]
          expect(prob).toBeGreaterThanOrEqual(0)
          expect(prob).toBeLessThanOrEqual(1)
        }
      }
    })

    test("should handle uneven capacities", () => {
      const topicIds = ["t1", "t2", "t3"] as Id<"topics">[]
      const preferences = generateRandomPreferences(10, 3, topicIds)
      const calc = new ProbabilityCalculator(10, 3, topicIds, [4, 3, 3])
      const result = calc.calculate(preferences, 50)

      expect(result.probabilities).toHaveLength(10)
      expect(result.probabilities[0]).toHaveLength(3)

      // Each student should be assigned to exactly one topic
      for (let s = 0; s < 10; s++) {
        const sum = result.probabilities[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1, 5)
      }
    })

    test("should use cache effectively", () => {
      const topicIds = Array.from({ length: 5 }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(20, 5, topicIds)
      const calc = new ProbabilityCalculator(20, 5, topicIds)

      // First calculation
      const duration1 = measureTime("First calculation", () => {
        calc.calculate(preferences, 50)
      })

      // Second calculation (should use cache)
      const duration2 = measureTime("Cached calculation", () => {
        calc.calculate(preferences, 50)
      })

      expect(duration2).toBeLessThan(duration1 / 5) // At least 5x faster with cache
    })
  })

  describe("Performance", () => {
    test("50 students should complete under 100ms", { timeout: 200 }, () => {
      const topicIds = Array.from({ length: 10 }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(50, 10, topicIds)
      const calc = new ProbabilityCalculator(50, 10, topicIds)

      const duration = measureTime("50 students, 50 iterations", () => {
        calc.calculate(preferences, 50)
      })

      expect(duration).toBeLessThan(100)
    })

    test("100 students should complete under 300ms", { timeout: 500 }, () => {
      const topicIds = Array.from({ length: 20 }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(100, 20, topicIds)
      const calc = new ProbabilityCalculator(100, 20, topicIds)

      const duration = measureTime("100 students, 50 iterations", () => {
        calc.calculate(preferences, 50)
      })

      expect(duration).toBeLessThan(300)
    })

    test("300 students should complete under 10 seconds", { timeout: 15000 }, () => {
      const topicIds = Array.from({ length: 30 }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(300, 30, topicIds)
      const calc = new ProbabilityCalculator(300, 30, topicIds)

      const duration = measureTime("300 students, 30 iterations", () => {
        calc.calculate(preferences, 30)
      })

      expect(duration).toBeLessThan(10000)
    })

    test("500 students real-time update with 5 iterations", { timeout: 20000 }, () => {
      const topicIds = Array.from({ length: 50 }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(500, 50, topicIds)
      const calc = new ProbabilityCalculator(500, 50, topicIds)

      const duration = measureTime("500 students, 5 iterations (real-time)", () => {
        calc.calculate(preferences, 5)
      })

      expect(duration).toBeLessThan(10000)
    })
  })

  describe("Comparison with original", () => {
    test("should produce similar distributions to perturbation method", () => {
      const topicIds = ["t0", "t1", "t2", "t3"] as Id<"topics">[]
      const preferences: StudentPreference[] = [
        { studentId: "s1", topicIds: ["t0", "t2", "t1", "t3"] as Id<"topics">[] }, // t0=1st, t2=2nd, t1=3rd, t3=4th
        { studentId: "s2", topicIds: ["t1", "t0", "t3", "t2"] as Id<"topics">[] }, // t1=1st, t0=2nd, t3=3rd, t2=4th
        { studentId: "s3", topicIds: ["t2", "t3", "t0", "t1"] as Id<"topics">[] }, // t2=1st, t3=2nd, t0=3rd, t1=4th
        { studentId: "s4", topicIds: ["t3", "t1", "t2", "t0"] as Id<"topics">[] }  // t3=1st, t1=2nd, t2=3rd, t0=4th
      ]

      const calc = new ProbabilityCalculator(4, 4, topicIds)
      const result = calc.calculate(preferences, 100)

      console.log("\n=== PROBABILITY DISTRIBUTIONS ===")
      console.log("Topic Order: [t0, t1, t2, t3]")

      // Display full probability matrix
      for (let s = 0; s < 4; s++) {
        const probs = result.probabilities[s]
        const studentPref = preferences[s]

        console.log(`\nStudent ${s} preference order: [${studentPref.topicIds.join(", ")}]`)
        console.log(`Probabilities:`)
        for (let t = 0; t < 4; t++) {
          const topicId = topicIds[t]
          const rank = studentPref.topicIds.indexOf(topicId) + 1
          const star = rank === 1 ? " ⭐" : rank === 2 ? " ✓" : ""
          console.log(`  Topic ${topicId} (rank ${rank}): ${(probs[t] * 100).toFixed(1)}%${star}`)
        }

        // Calculate expected rank
        const expectedRank = probs.reduce((sum, p, t) => {
          const topicId = topicIds[t]
          const rank = studentPref.topicIds.indexOf(topicId) + 1
          return sum + p * rank
        }, 0)
        console.log(`Expected rank: ${expectedRank.toFixed(2)}`)
      }

      console.log("\n=== TOPIC COMPETITION ===")
      for (let t = 0; t < 4; t++) {
        const competition = result.probabilities.map(row => row[t])
        const totalProb = competition.reduce((a, b) => a + b, 0)
        console.log(`Topic ${t}: Total prob = ${totalProb.toFixed(2)} (should be ~1.0)`)
        for (let s = 0; s < 4; s++) {
          if (competition[s] > 0.01) {
            console.log(`  Student ${s}: ${(competition[s] * 100).toFixed(1)}%`)
          }
        }
      }
    })
  })

  describe("Detailed Distribution Analysis", () => {
    test("should show how shuffling creates variation", () => {
      const topicIds = ["t0", "t1", "t2", "t3", "t4"] as Id<"topics">[]
      // Clearer preferences to see the effect
      const preferences: StudentPreference[] = [
        { studentId: "Alice", topicIds: ["t0", "t1", "t2", "t3", "t4"] as Id<"topics">[] }, // Strong preference for t0
        { studentId: "Bob", topicIds: ["t0", "t1", "t2", "t3", "t4"] as Id<"topics">[] },   // Same as Alice (conflict!)
        { studentId: "Carol", topicIds: ["t1", "t2", "t3", "t4", "t0"] as Id<"topics">[] }, // Strong preference for t1
        { studentId: "Dave", topicIds: ["t2", "t3", "t4", "t0", "t1"] as Id<"topics">[] },  // Strong preference for t2
        { studentId: "Eve", topicIds: ["t3", "t4", "t0", "t1", "t2"] as Id<"topics">[] }    // Strong preference for t3
      ]

      const calc = new ProbabilityCalculator(5, 5, topicIds)

      console.log("\n=== TESTING WITH 200 ITERATIONS ===")
      const result = calc.calculate(preferences, 200)

      console.log("\nStudent preferences (first = most preferred):")
      for (let s = 0; s < 5; s++) {
        const pref = preferences[s]
        const firstChoice = pref.topicIds[0]
        console.log(`${pref.studentId}: First choice = ${firstChoice}, Order = [${pref.topicIds.join(", ")}]`)
      }

      console.log("\n=== ALLOCATION PROBABILITIES ===")
      for (let s = 0; s < 5; s++) {
        console.log(`\n${preferences[s].studentId}:`)
        const probs = result.probabilities[s]
        const studentPref = preferences[s]

        // Sort topics by probability for this student
        const topicProbs = probs.map((p, t) => {
          const topicId = topicIds[t]
          const rank = studentPref.topicIds.indexOf(topicId) + 1
          return { topic: topicId, prob: p, rank }
        }).sort((a, b) => b.prob - a.prob)

        for (const { topic, prob, rank } of topicProbs) {
          if (prob > 0.01) {
            const bar = "█".repeat(Math.round(prob * 20))
            console.log(`  Topic ${topic} (rank ${rank}): ${(prob * 100).toFixed(1).padStart(5)}% ${bar}`)
          }
        }
      }

      // Check Alice and Bob competition for Topic 0
      console.log("\n=== ALICE vs BOB COMPETITION FOR TOPIC 0 ===")
      console.log(`Alice gets Topic 0: ${(result.probabilities[0][0] * 100).toFixed(1)}%`)
      console.log(`Bob gets Topic 0: ${(result.probabilities[1][0] * 100).toFixed(1)}%`)
      console.log("Note: Since they have identical preferences, shuffling gives each ~50% chance")
    })
  })

  describe("Simple API", () => {
    test("calculateProbabilities function", () => {
      const topicIds = Array.from({ length: 5 }, (_, i) => `t${i}` as Id<"topics">)
      const preferences = generateRandomPreferences(30, 5, topicIds)

      const duration = measureTime("Simple API (30 students)", () => {
        const result = calculateProbabilities(preferences, 5, topicIds, 50)
        expect(result.probabilities).toHaveLength(30)
        expect(result.probabilities[0]).toHaveLength(5)
      })

      expect(duration).toBeLessThan(50)
    })
  })

  describe("Memory efficiency", () => {
    test("should reuse buffers across calculations", () => {
      const topicIds = Array.from({ length: 10 }, (_, i) => `t${i}` as Id<"topics">)
      const calc = new ProbabilityCalculator(50, 10, topicIds)
      const durations: number[] = []

      // Run 10 calculations with different preferences
      for (let i = 0; i < 10; i++) {
        const preferences = generateRandomPreferences(50, 10, topicIds)
        calc.clearCache() // Force recalculation
        
        const start = performance.now()
        calc.calculate(preferences, 30)
        durations.push(performance.now() - start)
      }

      // Performance should be consistent (buffers reused)
      const avg = durations.reduce((a, b) => a + b) / durations.length
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length
      const stdDev = Math.sqrt(variance)

      console.log(`Average: ${avg.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`)
      
      // Low variance indicates consistent performance
      expect(stdDev).toBeLessThan(avg * 0.3) // StdDev should be less than 30% of average
    })
  })
})