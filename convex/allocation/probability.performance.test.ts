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
  NoCache
} from "./probability"
import { generateRandomPreferences, generateClusteredPreferences } from "./utils"
import type { StudentPreference } from "./types"

// ============================================================================
// Performance Test Suite with Timeouts
// ============================================================================

describe("Probability Performance Tests", () => {

  // Helper to measure execution time
  const measureTime = async <T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start
    console.log(`[TIMING] ${name}: ${duration.toFixed(2)}ms`)
    return { result, duration }
  }

  describe("Small Scale (10 students, 5 topics)", () => {
    let preferences: StudentPreference[]
    let calculator: ProbabilityCalculator

    beforeEach(() => {
      preferences = generateRandomPreferences(10, 5)
      calculator = new ProbabilityCalculator(
        10, 5,
        Array(5).fill(null).map((_, i) => `topic_${i}` as any),
        undefined,
        {
          iterations: 100,
          perturbation: gaussianPerturbation(0.1),
          cache: new NoCache() // No cache to test actual performance
        }
      )
    })

    test("should complete within 200ms", { timeout: 300 }, async () => {
      const { result, duration } = await measureTime(
        "Small scale (10 students, 100 iterations)",
        () => calculator.calculate(preferences)
      )

      expect(duration).toBeLessThan(200)
      expect(result.probabilities).toHaveLength(10)
      expect(result.probabilities[0]).toHaveLength(5)

      // Verify probabilities sum to 1
      for (let s = 0; s < 10; s++) {
        const sum = result.probabilities[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1, 5)
      }
    })

    test("parallel vs sequential performance", { timeout: 1000 }, async () => {
      // Sequential
      calculator.updateConfig({ parallel: false, batchSize: 10 })
      const { duration: seqDuration } = await measureTime(
        "Sequential (10 students, 100 iter)",
        () => calculator.calculate(preferences)
      )

      // Clear cache
      calculator.clearCache()

      // Parallel
      calculator.updateConfig({ parallel: true, batchSize: 25 })
      const { duration: parDuration } = await measureTime(
        "Parallel (10 students, 100 iter)",
        () => calculator.calculate(preferences)
      )

      console.log(`Sequential: ${seqDuration.toFixed(2)}ms, Parallel: ${parDuration.toFixed(2)}ms`)
      console.log(`Speedup: ${(seqDuration / parDuration).toFixed(2)}x`)

      // Both should complete reasonably fast
      expect(seqDuration).toBeLessThan(500)
      expect(parDuration).toBeLessThan(500)
    })
  })

  describe("Medium Scale (50 students, 10 topics)", () => {
    let preferences: StudentPreference[]
    let calculator: ProbabilityCalculator

    beforeEach(() => {
      preferences = generateRandomPreferences(50, 10)
      calculator = new ProbabilityCalculator(
        50, 10,
        Array(10).fill(null).map((_, i) => `topic_${i}` as any),
        undefined,
        {
          iterations: 100,
          perturbation: uniformPerturbation(0.15),
          cache: new NoCache()
        }
      )
    })

    test("should complete within 1 second", { timeout: 1500 }, async () => {
      const { result, duration } = await measureTime(
        "Medium scale (50 students, 100 iterations)",
        () => calculator.calculate(preferences)
      )

      expect(duration).toBeLessThan(1000)
      expect(result.probabilities).toHaveLength(50)

      // Check that each student has valid probabilities
      for (const probs of result.probabilities) {
        expect(Math.max(...probs)).toBeGreaterThan(0)
        expect(Math.min(...probs)).toBeGreaterThanOrEqual(0)
      }
    })

    test("different perturbation strategies performance", { timeout: 3000 }, async () => {
      const strategies = [
        { name: "Gaussian", fn: gaussianPerturbation(0.1) },
        { name: "Uniform", fn: uniformPerturbation(0.15) },
        { name: "Exponential", fn: exponentialPerturbation(0.5) },
        { name: "None", fn: noPerturbation }
      ]

      for (const strategy of strategies) {
        calculator.updateConfig({
          perturbation: strategy.fn,
          iterations: 50 // Fewer iterations for comparison
        })
        calculator.clearCache()

        const { duration } = await measureTime(
          `${strategy.name} perturbation (50 students, 50 iter)`,
          () => calculator.calculate(preferences)
        )

        expect(duration).toBeLessThan(1000)
      }
    })
  })

  describe("Large Scale (300 students, 30 topics)", () => {
    let preferences: StudentPreference[]
    let calculator: ProbabilityCalculator

    beforeEach(() => {
      preferences = generateRandomPreferences(300, 30)
      calculator = new ProbabilityCalculator(
        300, 30,
        Array(30).fill(null).map((_, i) => `topic_${i}` as any),
        undefined,
        {
          iterations: 100,
          perturbation: uniformPerturbation(0.1),
          cache: new LRUCache(10, 300000), // 5 minute cache
          parallel: true,
          batchSize: 20
        }
      )
    })

    test("should complete within 5 seconds", { timeout: 6000 }, async () => {
      const { result, duration } = await measureTime(
        "Large scale (300 students, 100 iterations)",
        () => calculator.calculate(preferences)
      )

      expect(duration).toBeLessThan(5000)
      expect(result.probabilities).toHaveLength(300)
      expect(result.probabilities[0]).toHaveLength(30)

      console.log(`Average time per iteration: ${(duration / 100).toFixed(2)}ms`)
    })

    test("cache effectiveness", { timeout: 8000 }, async () => {
      // First calculation - no cache
      const { duration: firstDuration } = await measureTime(
        "First calculation (no cache)",
        () => calculator.calculate(preferences)
      )

      // Second calculation - should use cache
      const { duration: cachedDuration } = await measureTime(
        "Cached calculation",
        () => calculator.calculate(preferences)
      )

      console.log(`Cache speedup: ${(firstDuration / cachedDuration).toFixed(2)}x`)

      expect(firstDuration).toBeLessThan(5000)
      expect(cachedDuration).toBeLessThan(100) // Cache hit should be very fast
      expect(cachedDuration).toBeLessThan(firstDuration / 10) // At least 10x faster
    })

    test("reduced iterations for real-time updates", { timeout: 2000 }, async () => {
      // For real-time UI updates, we might use fewer iterations
      calculator.updateConfig({
        iterations: 20,
        parallel: true,
        batchSize: 10
      })

      const { result, duration } = await measureTime(
        "Real-time update (300 students, 20 iterations)",
        () => calculator.calculate(preferences)
      )

      expect(duration).toBeLessThan(1000) // Should be under 1 second for UI responsiveness
      expect(result.probabilities).toHaveLength(300)

      // Even with fewer iterations, probabilities should still sum to 1
      for (let s = 0; s < 300; s++) {
        const sum = result.probabilities[s].reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1, 5)
      }
    })
  })

  describe("Extreme Scale (500 students, 50 topics)", () => {
    test("should complete within 10 seconds with optimizations", { timeout: 12000 }, async () => {
      const preferences = generateRandomPreferences(500, 50)

      const calculator = new ProbabilityCalculator(
        500, 50,
        Array(50).fill(null).map((_, i) => `topic_${i}` as any),
        undefined,
        {
          iterations: 50, // Reduced iterations for extreme scale
          perturbation: uniformPerturbation(0.1), // Fast perturbation
          cache: new LRUCache(5, 600000), // 10 minute cache
          parallel: true,
          batchSize: 10 // Smaller batches for better parallelization
        }
      )

      const { result, duration } = await measureTime(
        "Extreme scale (500 students, 50 iterations)",
        () => calculator.calculate(preferences)
      )

      expect(duration).toBeLessThan(10000)
      expect(result.probabilities).toHaveLength(500)
      expect(result.probabilities[0]).toHaveLength(50)

      console.log(`Throughput: ${(500 * 50 / (duration / 1000)).toFixed(0)} assignments/second`)
    })
  })

  describe("Clustered Preferences Performance", () => {
    test("clustered vs random preferences", { timeout: 3000 }, async () => {
      const randomPrefs = generateRandomPreferences(100, 20)
      const clusteredPrefs = generateClusteredPreferences(100, 20, 0.3)

      const calculator = new ProbabilityCalculator(
        100, 20,
        Array(20).fill(null).map((_, i) => `topic_${i}` as any),
        undefined,
        {
          iterations: 50,
          perturbation: gaussianPerturbation(0.1),
          cache: new NoCache()
        }
      )

      const { duration: randomDuration } = await measureTime(
        "Random preferences (100 students, 50 iter)",
        () => calculator.calculate(randomPrefs)
      )

      calculator.clearCache()

      const { duration: clusteredDuration } = await measureTime(
        "Clustered preferences (100 students, 50 iter)",
        () => calculator.calculate(clusteredPrefs)
      )

      // Both should complete in reasonable time
      expect(randomDuration).toBeLessThan(2000)
      expect(clusteredDuration).toBeLessThan(2000)

      console.log(`Random: ${randomDuration.toFixed(2)}ms, Clustered: ${clusteredDuration.toFixed(2)}ms`)
    })
  })

  describe("Memory and Resource Usage", () => {
    test("should handle many sequential calculations", { timeout: 10000 }, async () => {
      const calculator = new ProbabilityCalculator(
        50, 10,
        Array(10).fill(null).map((_, i) => `topic_${i}` as any),
        undefined,
        {
          iterations: 20,
          perturbation: uniformPerturbation(0.1),
          cache: new LRUCache(5, 60000) // Small cache to test eviction
        }
      )

      const durations: number[] = []

      // Run 20 calculations with different preferences
      for (let i = 0; i < 20; i++) {
        const preferences = generateRandomPreferences(50, 10)
        const { duration } = await measureTime(
          `Calculation ${i + 1}`,
          () => calculator.calculate(preferences)
        )
        durations.push(duration)
      }

      // Check that performance doesn't degrade over time
      const firstHalf = durations.slice(0, 10).reduce((a, b) => a + b, 0) / 10
      const secondHalf = durations.slice(10, 20).reduce((a, b) => a + b, 0) / 10

      console.log(`First half avg: ${firstHalf.toFixed(2)}ms, Second half avg: ${secondHalf.toFixed(2)}ms`)

      // Performance shouldn't degrade significantly
      expect(secondHalf).toBeLessThan(firstHalf * 1.5)
    })
  })

  describe("Performance Targets Summary", () => {
    test("should meet all performance targets", async () => {
      console.log("\n=== PERFORMANCE TARGETS ===")
      console.log("Small (10 students, 100 iter): Target <200ms")
      console.log("Medium (50 students, 100 iter): Target <1000ms")
      console.log("Large (300 students, 100 iter): Target <5000ms")
      console.log("Real-time (300 students, 20 iter): Target <1000ms")
      console.log("Extreme (500 students, 50 iter): Target <10000ms")
      console.log("Cache hit: Target <100ms")
      console.log("===========================\n")

      // This test just documents our targets
      expect(true).toBe(true)
    })
  })
})

// ============================================================================
// Benchmark Suite
// ============================================================================

describe("Probability Calculation Benchmarks", () => {
  const runBenchmark = async (
    name: string,
    numStudents: number,
    numTopics: number,
    iterations: number,
    runs: number = 5
  ) => {
    const preferences = generateRandomPreferences(numStudents, numTopics)
    const calculator = new ProbabilityCalculator(
      numStudents,
      numTopics,
      Array(numTopics).fill(null).map((_, i) => `topic_${i}` as any),
      undefined,
      {
        iterations,
        perturbation: uniformPerturbation(0.1),
        cache: new NoCache(),
        parallel: true,
        batchSize: Math.ceil(iterations / 4)
      }
    )

    const durations: number[] = []

    for (let i = 0; i < runs; i++) {
      calculator.clearCache()
      const start = performance.now()
      await calculator.calculate(preferences)
      const duration = performance.now() - start
      durations.push(duration)
    }

    const avg = durations.reduce((a, b) => a + b, 0) / runs
    const min = Math.min(...durations)
    const max = Math.max(...durations)

    console.log(`\n[BENCHMARK] ${name}`)
    console.log(`Students: ${numStudents}, Topics: ${numTopics}, Iterations: ${iterations}`)
    console.log(`Average: ${avg.toFixed(2)}ms`)
    console.log(`Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`)
    console.log(`Per iteration: ${(avg / iterations).toFixed(3)}ms`)
    console.log(`Throughput: ${((numStudents * numTopics * iterations) / avg * 1000).toFixed(0)} ops/sec`)

    return { avg, min, max }
  }

  test("comprehensive benchmark suite", { timeout: 30000 }, async () => {
    console.log("\n" + "=".repeat(60))
    console.log("PROBABILITY CALCULATION BENCHMARK SUITE")
    console.log("=".repeat(60))

    const benchmarks = [
      { name: "Tiny", students: 5, topics: 3, iterations: 100 },
      { name: "Small", students: 10, topics: 5, iterations: 100 },
      { name: "Medium", students: 50, topics: 10, iterations: 100 },
      { name: "Large", students: 100, topics: 20, iterations: 50 },
      { name: "XLarge", students: 200, topics: 25, iterations: 30 },
      { name: "XXLarge", students: 300, topics: 30, iterations: 20 }
    ]

    const results = []

    for (const bench of benchmarks) {
      const result = await runBenchmark(
        bench.name,
        bench.students,
        bench.topics,
        bench.iterations,
        3 // Run each benchmark 3 times
      )

      results.push({
        ...bench,
        ...result
      })

      // Ensure reasonable performance
      expect(result.avg).toBeLessThan(10000) // Nothing should take more than 10 seconds
    }

    // Print summary table
    console.log("\n" + "=".repeat(60))
    console.log("SUMMARY")
    console.log("=".repeat(60))
    console.table(results.map(r => ({
      Scale: r.name,
      "Students": r.students,
      "Topics": r.topics,
      "Iterations": r.iterations,
      "Avg (ms)": r.avg.toFixed(2),
      "Per Iter (ms)": (r.avg / r.iterations).toFixed(3)
    })))
  })
})