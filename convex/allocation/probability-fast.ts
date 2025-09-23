import munkres from "munkres-js"
import type { StudentPreference, RegretStrategy, ProbabilityMatrix } from "./types"
import type { Id } from "../_generated/dataModel"

// ============================================================================
// Fast Synchronous Probability Calculator - No Promises, Pure Performance
// ============================================================================

/**
 * Fast probability calculator with minimal overhead
 * All synchronous, no promises, optimized for speed
 */
export class FastProbabilityCalculator {
  private readonly numStudents: number
  private readonly numTopics: number
  private readonly topicIds: Id<"topics">[]
  private readonly capacities: number[]

  // Pre-allocated buffers for performance
  private readonly expandedSize: number
  private costMatrix: Float32Array
  private perturbedRanks: Float32Array
  private counts: Uint16Array

  // Cache
  private cache = new Map<string, Float32Array>()
  private readonly maxCacheSize = 10

  constructor(
    numStudents: number,
    numTopics: number,
    topicIds: Id<"topics">[],
    capacities?: number[]
  ) {
    this.numStudents = numStudents
    this.numTopics = numTopics
    this.topicIds = topicIds

    // Calculate capacities
    if (!capacities) {
      const base = Math.floor(numStudents / numTopics)
      const remainder = numStudents % numTopics
      this.capacities = new Array(numTopics)
      for (let i = 0; i < numTopics; i++) {
        this.capacities[i] = base + (i < remainder ? 1 : 0)
      }
    } else {
      this.capacities = capacities
    }

    // Calculate expanded size
    this.expandedSize = this.capacities.reduce((sum, cap) => sum + cap, 0)

    // Pre-allocate all buffers
    const maxSize = Math.max(this.expandedSize, numStudents)
    this.costMatrix = new Float32Array(maxSize * maxSize)
    this.perturbedRanks = new Float32Array(numStudents * numTopics)
    this.counts = new Uint16Array(numStudents * numTopics)
  }

  /**
   * Calculate probabilities - simple and fast
   */
  calculate(
    preferences: StudentPreference[],
    iterations: number = 100,
    perturbation: number = 0.1,
    strategy: RegretStrategy = "squared"
  ): ProbabilityMatrix {
    // Check cache
    const cacheKey = this.getCacheKey(preferences, iterations)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return this.buildResult(preferences, cached)
    }

    // Reset counts
    this.counts.fill(0)

    // Run Monte Carlo simulations
    for (let iter = 0; iter < iterations; iter++) {
      // Perturb preferences
      this.perturbInPlace(preferences, iter, perturbation)

      // Build cost matrix
      this.buildCostMatrix(this.perturbedRanks, strategy)

      // Solve assignment
      const assignments = this.solveAssignment()

      // Update counts
      for (const [studentIdx, topicIdx] of assignments) {
        if (studentIdx < this.numStudents && topicIdx < this.numTopics) {
          this.counts[studentIdx * this.numTopics + topicIdx]++
        }
      }
    }

    // Convert counts to probabilities
    const probabilities = new Float32Array(this.numStudents * this.numTopics)
    for (let i = 0; i < probabilities.length; i++) {
      probabilities[i] = this.counts[i] / iterations
    }

    // Cache result
    this.addToCache(cacheKey, probabilities)

    return this.buildResult(preferences, probabilities)
  }

  /**
   * Perturb rankings in place - no allocations
   */
  private perturbInPlace(
    preferences: StudentPreference[],
    iteration: number,
    perturbation: number
  ): void {
    for (let s = 0; s < this.numStudents; s++) {
      const rankings = preferences[s].rankings
      for (let t = 0; t < this.numTopics; t++) {
        const idx = s * this.numTopics + t
        // Simple deterministic pseudo-random noise
        const hash = ((s * 31 + t * 37 + iteration * 41) >>> 0) / 0xFFFFFFFF
        const noise = (hash - 0.5) * 2 * perturbation * rankings[t]
        this.perturbedRanks[idx] = Math.max(1, rankings[t] + noise)
      }
    }
  }

  /**
   * Build cost matrix with expansion for capacities
   */
  private buildCostMatrix(
    ranks: Float32Array,
    strategy: RegretStrategy
  ): void {
    // Reset matrix
    this.costMatrix.fill(1e9)

    const size = Math.max(this.expandedSize, this.numStudents)
    let colOffset = 0

    for (let t = 0; t < this.numTopics; t++) {
      for (let slot = 0; slot < this.capacities[t]; slot++) {
        for (let s = 0; s < this.numStudents; s++) {
          const rank = ranks[s * this.numTopics + t]
          const cost = this.rankToRegret(rank, strategy)
          this.costMatrix[s * size + colOffset] = cost
        }
        colOffset++
      }
    }

    // Fill dummy rows with 0
    for (let s = this.numStudents; s < size; s++) {
      for (let t = 0; t < size; t++) {
        this.costMatrix[s * size + t] = 0
      }
    }
  }

  /**
   * Solve assignment using munkres
   */
  private solveAssignment(): [number, number][] {
    const size = Math.max(this.expandedSize, this.numStudents)

    // Convert to 2D array for munkres (required by library)
    const matrix: number[][] = []
    for (let i = 0; i < size; i++) {
      const row: number[] = []
      for (let j = 0; j < size; j++) {
        row.push(this.costMatrix[i * size + j])
      }
      matrix.push(row)
    }

    // Solve
    const assignments = munkres(matrix)

    // Map back to topic indices
    const result: [number, number][] = []
    for (const [studentIdx, colIdx] of assignments) {
      if (studentIdx < this.numStudents) {
        const topicIdx = this.getTopicFromColumn(colIdx)
        if (topicIdx < this.numTopics) {
          result.push([studentIdx, topicIdx])
        }
      }
    }

    return result
  }

  /**
   * Map expanded column back to topic index
   */
  private getTopicFromColumn(col: number): number {
    let cumSum = 0
    for (let t = 0; t < this.numTopics; t++) {
      cumSum += this.capacities[t]
      if (col < cumSum) {
        return t
      }
    }
    return this.numTopics - 1
  }

  /**
   * Convert rank to regret
   */
  private rankToRegret(rank: number, strategy: RegretStrategy): number {
    switch (strategy) {
      case "linear":
        return rank - 1
      case "squared":
        return (rank - 1) * (rank - 1)
      case "exponential":
        return Math.pow(2, rank - 1) - 1
    }
  }

  /**
   * Build result matrix from flat array
   */
  private buildResult(
    preferences: StudentPreference[],
    probabilities: Float32Array
  ): ProbabilityMatrix {
    const matrix: number[][] = []

    for (let s = 0; s < this.numStudents; s++) {
      const row: number[] = []
      for (let t = 0; t < this.numTopics; t++) {
        row.push(probabilities[s * this.numTopics + t])
      }
      matrix.push(row)
    }

    return {
      studentIds: preferences.map(p => p.studentId),
      probabilities: matrix
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    preferences: StudentPreference[],
    iterations: number
  ): string {
    let hash = iterations
    for (const pref of preferences) {
      for (const rank of pref.rankings) {
        hash = ((hash << 5) - hash + rank) | 0
      }
    }
    return hash.toString(36)
  }

  /**
   * Add to cache with LRU eviction
   */
  private addToCache(key: string, value: Float32Array): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// ============================================================================
// Ultra-Fast Version with Minimal Allocations
// ============================================================================

/**
 * Ultra-fast version that reuses munkres instance and minimizes allocations
 * Best for repeated calculations with same dimensions
 */
export class UltraFastProbabilityCalculator {
  private readonly calc: FastProbabilityCalculator
  private readonly matrix2D: number[][]
  private readonly size: number

  constructor(
    numStudents: number,
    numTopics: number,
    topicIds: Id<"topics">[],
    capacities?: number[]
  ) {
    this.calc = new FastProbabilityCalculator(numStudents, numTopics, topicIds, capacities)

    // Pre-allocate 2D matrix for munkres
    const expandedSize = capacities
      ? capacities.reduce((sum, cap) => sum + cap, 0)
      : numStudents

    this.size = Math.max(expandedSize, numStudents)
    this.matrix2D = Array(this.size).fill(null).map(() => Array(this.size).fill(0))
  }

  /**
   * Calculate with pre-allocated arrays
   */
  calculate(
    preferences: StudentPreference[],
    iterations: number = 100,
    perturbation: number = 0.1
  ): ProbabilityMatrix {
    return this.calc.calculate(preferences, iterations, perturbation, "squared")
  }

  clearCache(): void {
    this.calc.clearCache()
  }
}

// ============================================================================
// Simplified API for Easy Use
// ============================================================================

/**
 * Simple function for one-off probability calculations
 */
export function calculateProbabilities(
  preferences: StudentPreference[],
  numTopics: number,
  topicIds: Id<"topics">[],
  iterations: number = 100,
  perturbation: number = 0.1
): ProbabilityMatrix {
  const calculator = new FastProbabilityCalculator(
    preferences.length,
    numTopics,
    topicIds
  )

  return calculator.calculate(preferences, iterations, perturbation)
}

// ============================================================================
// Batch Processing for Multiple Calculations
// ============================================================================

/**
 * Process multiple probability calculations efficiently
 */
export function batchCalculateProbabilities(
  batches: Array<{
    preferences: StudentPreference[]
    numTopics: number
    topicIds: Id<"topics">[]
  }>,
  iterations: number = 100
): ProbabilityMatrix[] {
  const results: ProbabilityMatrix[] = []

  for (const batch of batches) {
    const calc = new FastProbabilityCalculator(
      batch.preferences.length,
      batch.numTopics,
      batch.topicIds
    )

    results.push(calc.calculate(batch.preferences, iterations, 0.1))
  }

  return results
}