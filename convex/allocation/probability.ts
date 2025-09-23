import { shuffleArray } from "../lib/utils"
import { HungarianAllocator } from "./algorithm"
import type { StudentPreference, ProbabilityMatrix } from "./types"
import type { Id } from "../_generated/dataModel"

/**
 * Simple, fast probability calculator
 * Uses shuffling instead of perturbation for randomness
 */
export class ProbabilityCalculator {
  private readonly numStudents: number
  private readonly numTopics: number
  private readonly topicIds: Id<"topics">[]
  private readonly capacities: number[]
  private readonly totalSlots: number

  // Pre-allocated buffers
  private readonly counts: Uint16Array
  private readonly allocator: HungarianAllocator

  // Simple cache
  private cache = new Map<string, Float32Array>()

  constructor(
    numStudents: number,
    numTopics: number,
    topicIds: Id<"topics">[],
    capacities?: number[]
  ) {
    this.numStudents = numStudents
    this.numTopics = numTopics
    this.topicIds = topicIds

    // Calculate even capacities if not provided
    if (!capacities) {
      const base = Math.floor(numStudents / numTopics)
      const remainder = numStudents % numTopics
      this.capacities = Array(numTopics).fill(base)
      for (let i = 0; i < remainder; i++) {
        this.capacities[i]++
      }
    } else {
      this.capacities = capacities
    }

    this.totalSlots = this.capacities.reduce((sum, cap) => sum + cap, 0)

    // Pre-allocate
    this.counts = new Uint16Array(numStudents * numTopics)

    // Create allocator
    this.allocator = new HungarianAllocator(
      numStudents,
      numTopics,
      topicIds,
      this.capacities
    )
  }

  /**
   * Calculate probabilities using shuffling for randomness
   */
  calculate(
    preferences: StudentPreference[],
    iterations: number = 50
  ): ProbabilityMatrix {
    // Check cache
    const cacheKey = this.getCacheKey(preferences)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return this.buildResult(preferences, cached)
    }

    // Reset counts
    this.counts.fill(0)

    // Run Monte Carlo with shuffling
    for (let iter = 0; iter < iterations; iter++) {
      // Shuffle preferences to introduce randomness
      const shuffled = iter === 0 ? preferences : shuffleArray(preferences) as StudentPreference[]

      // Solve using optimized allocator
      const result = this.allocator.solve(shuffled, "squared")

      // Update counts (map back to original student indices)
      for (const assignment of result.assignments) {
        const originalIdx = preferences.findIndex(p => p.studentId === assignment.studentId)
        const topicIdx = this.topicIds.indexOf(assignment.topicId)
        if (originalIdx >= 0 && topicIdx >= 0) {
          this.counts[originalIdx * this.numTopics + topicIdx]++
        }
      }
    }

    // Convert to probabilities
    const probs = new Float32Array(this.numStudents * this.numTopics)
    for (let i = 0; i < probs.length; i++) {
      probs[i] = this.counts[i] / iterations
    }

    // Cache and return
    this.cache.set(cacheKey, probs)
    return this.buildResult(preferences, probs)
  }


  /**
   * Build result from flat array
   */
  private buildResult(
    preferences: StudentPreference[],
    probs: Float32Array
  ): ProbabilityMatrix {
    const matrix: number[][] = []
    for (let s = 0; s < this.numStudents; s++) {
      const row: number[] = []
      for (let t = 0; t < this.numTopics; t++) {
        row.push(probs[s * this.numTopics + t])
      }
      matrix.push(row)
    }

    return {
      studentIds: preferences.map(p => p.studentId),
      probabilities: matrix
    }
  }

  /**
   * Simple hash for cache key
   */
  private getCacheKey(preferences: StudentPreference[]): string {
    let hash = 0
    for (const pref of preferences) {
      for (let i = 0; i < pref.topicIds.length; i++) {
        // Use position in preference list for hashing
        hash = ((hash << 5) - hash + i) | 0
      }
    }
    return hash.toString(36)
  }

  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Simple function for one-off calculations
 */
export function calculateProbabilities(
  preferences: StudentPreference[],
  numTopics: number,
  topicIds: Id<"topics">[],
  iterations: number = 50,
  capacities?: number[]
): ProbabilityMatrix {
  const calc = new ProbabilityCalculator(preferences.length, numTopics, topicIds, capacities)
  return calc.calculate(preferences, iterations)
}