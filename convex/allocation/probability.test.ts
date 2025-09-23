import { describe, test, expect, beforeEach } from "vitest"
import {
  ProbabilityCalculator,
  gaussianPerturbation,
  uniformPerturbation,
  exponentialPerturbation,
  noPerturbation,
  frequencyAggregation,
  weightedAggregation,
  LRUCache,
  NoCache,
  analyzeProbabilities,
  getStudentView
} from "./probability"
import type { StudentPreference } from "./types"
import { generateRandomPreferences } from "./utils"

describe("Perturbation Strategies", () => {
  describe("gaussianPerturbation", () => {
    test("should add gaussian noise to ranks", () => {
      const perturb = gaussianPerturbation(0.1)

      // Test multiple iterations to check distribution
      const results: number[] = []
      for (let i = 0; i < 100; i++) {
        results.push(perturb(5, 0, 0, i))
      }

      // All should be positive
      expect(results.every(r => r >= 1)).toBe(true)

      // Should have some variance
      const uniqueValues = new Set(results)
      expect(uniqueValues.size).toBeGreaterThan(1)

      // Mean should be within reasonable range (with pseudo-random it may drift)
      const mean = results.reduce((a, b) => a + b, 0) / results.length
      expect(mean).toBeGreaterThan(3)
      expect(mean).toBeLessThan(8)
    })

    test("should scale noise with rank", () => {
      const perturb = gaussianPerturbation(0.2)

      const rank1Results: number[] = []
      const rank10Results: number[] = []

      for (let i = 0; i < 100; i++) {
        rank1Results.push(perturb(1, 0, 0, i))
        rank10Results.push(perturb(10, 0, 0, i))
      }

      // Calculate variance
      const variance = (arr: number[]) => {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length
        return arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length
      }

      // Higher rank should have higher variance
      expect(variance(rank10Results)).toBeGreaterThan(variance(rank1Results))
    })
  })

  describe("uniformPerturbation", () => {
    test("should add uniform noise within range", () => {
      const perturb = uniformPerturbation(0.2)

      const results: number[] = []
      for (let i = 0; i < 100; i++) {
        results.push(perturb(5, 0, 0, i))
      }

      // Check bounds: 5 ± (0.2 * 5) = [4, 6]
      expect(Math.min(...results)).toBeGreaterThanOrEqual(4)
      expect(Math.max(...results)).toBeLessThanOrEqual(6)
    })
  })

  describe("exponentialPerturbation", () => {
    test("should apply less noise to top choices", () => {
      const perturb = exponentialPerturbation(0.5)

      const rank1Noise: number[] = []
      const rank5Noise: number[] = []

      for (let i = 0; i < 100; i++) {
        rank1Noise.push(Math.abs(perturb(1, 0, 0, i) - 1))
        rank5Noise.push(Math.abs(perturb(5, 0, 0, i) - 5))
      }

      // Average noise for rank 1 should be less than rank 5
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
      expect(avg(rank1Noise)).toBeLessThan(avg(rank5Noise))
    })
  })

  describe("noPerturbation", () => {
    test("should return rank unchanged", () => {
      expect(noPerturbation(1, 0, 0, 0)).toBe(1)
      expect(noPerturbation(5, 1, 2, 100)).toBe(5)
    })
  })
})

describe("Aggregation Strategies", () => {
  const mockAssignments = [
    // Iteration 1: s0->t0, s1->t1, s2->t2
    [
      { studentIndex: 0, topicIndex: 0, regret: 0 },
      { studentIndex: 1, topicIndex: 1, regret: 0 },
      { studentIndex: 2, topicIndex: 2, regret: 0 }
    ],
    // Iteration 2: s0->t0, s1->t2, s2->t1
    [
      { studentIndex: 0, topicIndex: 0, regret: 0 },
      { studentIndex: 1, topicIndex: 2, regret: 1 },
      { studentIndex: 2, topicIndex: 1, regret: 1 }
    ],
    // Iteration 3: s0->t1, s1->t0, s2->t2
    [
      { studentIndex: 0, topicIndex: 1, regret: 1 },
      { studentIndex: 1, topicIndex: 0, regret: 1 },
      { studentIndex: 2, topicIndex: 2, regret: 0 }
    ]
  ]

  describe("frequencyAggregation", () => {
    test("should count frequencies correctly", () => {
      const probs = frequencyAggregation(mockAssignments, 3, 3)

      // Student 0: t0 twice, t1 once
      expect(probs[0][0]).toBeCloseTo(2/3)
      expect(probs[0][1]).toBeCloseTo(1/3)
      expect(probs[0][2]).toBeCloseTo(0)

      // Student 1: t0 once, t1 once, t2 once
      expect(probs[1][0]).toBeCloseTo(1/3)
      expect(probs[1][1]).toBeCloseTo(1/3)
      expect(probs[1][2]).toBeCloseTo(1/3)

      // Student 2: t1 once, t2 twice
      expect(probs[2][0]).toBeCloseTo(0)
      expect(probs[2][1]).toBeCloseTo(1/3)
      expect(probs[2][2]).toBeCloseTo(2/3)
    })

    test("should sum to 1 for each student", () => {
      const probs = frequencyAggregation(mockAssignments, 3, 3)

      for (let s = 0; s < 3; s++) {
        const sum = probs[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1)
      }
    })
  })

  describe("weightedAggregation", () => {
    test("should weight recent iterations more", () => {
      const weighted = weightedAggregation(0.5)
      const probs = weighted(mockAssignments, 3, 3)

      // Later iterations should have more influence
      // Student 0's last assignment was to t1
      expect(probs[0][1]).toBeGreaterThan(probs[0][2])
    })
  })
})

describe("Cache Strategies", () => {
  describe("LRUCache", () => {
    let cache: LRUCache

    beforeEach(() => {
      cache = new LRUCache(3, 1000)
    })

    test("should store and retrieve values", () => {
      const matrix = {
        studentIds: ["s1", "s2"],
        probabilities: [[0.5, 0.5], [0.3, 0.7]]
      }

      cache.set("key1", matrix)
      const retrieved = cache.get("key1")

      expect(retrieved).toEqual(matrix)
    })

    test("should evict oldest when at capacity", () => {
      const matrices = Array(4).fill(null).map((_, i) => ({
        studentIds: [`s${i}`],
        probabilities: [[i]]
      }))

      cache.set("key1", matrices[0])
      cache.set("key2", matrices[1])
      cache.set("key3", matrices[2])
      cache.set("key4", matrices[3]) // Should evict key1

      expect(cache.get("key1")).toBeNull()
      expect(cache.get("key2")).not.toBeNull()
      expect(cache.get("key3")).not.toBeNull()
      expect(cache.get("key4")).not.toBeNull()
    })

    test("should respect TTL", async () => {
      const shortCache = new LRUCache(10, 50) // 50ms TTL
      const matrix = {
        studentIds: ["s1"],
        probabilities: [[1]]
      }

      shortCache.set("key", matrix)
      expect(shortCache.get("key")).not.toBeNull()

      await new Promise(resolve => setTimeout(resolve, 60))
      expect(shortCache.get("key")).toBeNull()
    })
  })

  describe("NoCache", () => {
    test("should never store values", () => {
      const cache = new NoCache()
      const matrix = {
        studentIds: ["s1"],
        probabilities: [[1]]
      }

      cache.set("key", matrix)
      expect(cache.get("key")).toBeNull()
    })
  })
})

describe("ProbabilityCalculator", () => {
  describe("Basic Calculation", () => {
    test("should calculate probabilities for simple case", async () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 2, 3] },
        { studentId: "s2", rankings: [2, 1, 3] },
        { studentId: "s3", rankings: [3, 2, 1] }
      ]

      const calculator = new ProbabilityCalculator(
        3, 3,
        ["t1" as any, "t2" as any, "t3" as any],
        undefined,
        {
          iterations: 10,
          perturbation: uniformPerturbation(0.1),
          cache: new NoCache()
        }
      )

      const matrix = await calculator.calculate(preferences)

      expect(matrix.studentIds).toEqual(["s1", "s2", "s3"])
      expect(matrix.probabilities).toHaveLength(3)
      expect(matrix.probabilities[0]).toHaveLength(3)

      // Each student's probabilities should sum to 1
      for (let s = 0; s < 3; s++) {
        const sum = matrix.probabilities[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1)
      }
    })

    test("should handle deterministic case", async () => {
      const preferences: StudentPreference[] = [
        { studentId: "s1", rankings: [1, 3, 2] },
        { studentId: "s2", rankings: [3, 1, 2] },
        { studentId: "s3", rankings: [2, 3, 1] }
      ]

      const calculator = new ProbabilityCalculator(
        3, 3,
        ["t1" as any, "t2" as any, "t3" as any],
        undefined,
        {
          iterations: 5,
          perturbation: noPerturbation, // No randomness
          cache: new NoCache()
        }
      )

      const matrix = await calculator.calculate(preferences)

      // With no perturbation, same assignment every time
      // So probabilities should be 0 or 1
      for (let s = 0; s < 3; s++) {
        for (let t = 0; t < 3; t++) {
          const prob = matrix.probabilities[s][t]
          expect(prob === 0 || prob === 1).toBe(true)
        }
      }
    })
  })

  describe("Caching", () => {
    test("should use cache on repeated calls", async () => {
      const preferences = generateRandomPreferences(5, 3)
      let calculationCount = 0

      // Custom cache to track hits
      const cache = new LRUCache()
      const originalGet = cache.get.bind(cache)
      cache.get = (key: string) => {
        const result = originalGet(key)
        if (!result) calculationCount++
        return result
      }

      const calculator = new ProbabilityCalculator(
        5, 3,
        ["t1" as any, "t2" as any, "t3" as any],
        undefined,
        { iterations: 5, cache }
      )

      await calculator.calculate(preferences)
      expect(calculationCount).toBe(1)

      await calculator.calculate(preferences)
      expect(calculationCount).toBe(1) // Should use cache
    })
  })

  describe("Parallel Calculation", () => {
    test("should produce similar results in parallel mode", async () => {
      const preferences = generateRandomPreferences(10, 5)
      const topicIds = Array(5).fill(null).map((_, i) => `t${i}` as any)

      const sequentialCalc = new ProbabilityCalculator(
        10, 5, topicIds, undefined,
        {
          iterations: 20,
          perturbation: uniformPerturbation(0.1),
          parallel: false,
          cache: new NoCache()
        }
      )

      const parallelCalc = new ProbabilityCalculator(
        10, 5, topicIds, undefined,
        {
          iterations: 20,
          perturbation: uniformPerturbation(0.1),
          parallel: true,
          batchSize: 5,
          cache: new NoCache()
        }
      )

      const seqResult = await sequentialCalc.calculate(preferences)
      const parResult = await parallelCalc.calculate(preferences)

      // Results should be similar (not exact due to randomness)
      for (let s = 0; s < 10; s++) {
        for (let t = 0; t < 5; t++) {
          const diff = Math.abs(
            seqResult.probabilities[s][t] - parResult.probabilities[s][t]
          )
          expect(diff).toBeLessThan(0.3) // Allow 30% difference due to randomness
        }
      }
    })
  })
})

describe("Probability Analysis", () => {
  const mockMatrix = {
    studentIds: ["s1", "s2", "s3"],
    probabilities: [
      [0.8, 0.1, 0.1],  // s1: likely t1
      [0.2, 0.6, 0.2],  // s2: likely t2
      [0.3, 0.3, 0.4]   // s3: uncertain
    ]
  }

  const mockPreferences: StudentPreference[] = [
    { studentId: "s1", rankings: [1, 2, 3] },
    { studentId: "s2", rankings: [2, 1, 3] },
    { studentId: "s3", rankings: [3, 2, 1] }
  ]

  describe("analyzeProbabilities", () => {
    test("should calculate certainty correctly", () => {
      const analysis = analyzeProbabilities(mockMatrix, mockPreferences)

      expect(analysis.certainty[0]).toBe(0.8)  // s1's max prob
      expect(analysis.certainty[1]).toBe(0.6)  // s2's max prob
      expect(analysis.certainty[2]).toBe(0.4)  // s3's max prob
    })

    test("should calculate stability", () => {
      const analysis = analyzeProbabilities(mockMatrix, mockPreferences)

      const expectedStability = (0.8 + 0.6 + 0.4) / 3
      expect(analysis.stability).toBeCloseTo(expectedStability)
    })

    test("should calculate expected regret", () => {
      const analysis = analyzeProbabilities(mockMatrix, mockPreferences, "squared")

      // Manual calculation:
      // s1: 0.8*(1-1)² + 0.1*(2-1)² + 0.1*(3-1)² = 0 + 0.1 + 0.4 = 0.5
      // s2: 0.2*(2-1)² + 0.6*(1-1)² + 0.2*(3-1)² = 0.2 + 0 + 0.8 = 1.0
      // s3: 0.3*(3-1)² + 0.3*(2-1)² + 0.4*(1-1)² = 1.2 + 0.3 + 0 = 1.5
      // Total: 3.0

      expect(analysis.expectedRegret).toBeCloseTo(3.0)
    })
  })

  describe("getStudentView", () => {
    test("should return student probability view", () => {
      const view = getStudentView(mockMatrix, "s1", mockPreferences, 3)

      expect(view).not.toBeNull()
      expect(view!.studentId).toBe("s1")
      expect(view!.topProbabilities).toHaveLength(3)

      // Should be sorted by probability
      expect(view!.topProbabilities[0].probability).toBe(0.8)
      expect(view!.topProbabilities[0].topicIndex).toBe(0)
      expect(view!.topProbabilities[0].rank).toBe(1)
    })

    test("should calculate expected rank", () => {
      const view = getStudentView(mockMatrix, "s2", mockPreferences, 3)

      // s2: 0.2*2 + 0.6*1 + 0.2*3 = 0.4 + 0.6 + 0.6 = 1.6
      expect(view!.expectedRank).toBeCloseTo(1.6)
    })

    test("should handle unknown student", () => {
      const view = getStudentView(mockMatrix, "unknown", mockPreferences, 3)
      expect(view).toBeNull()
    })
  })
})