import { HungarianAllocator } from "./algorithm"
import type {
  StudentPreference,
  Assignment,
  ProbabilityMatrix,
  RegretStrategy
} from "./types"
import { ALLOCATION_CONSTANTS } from "./types"
import type { Id } from "../_generated/dataModel"

// ============================================================================
// Perturbation Strategies - Composable noise functions
// ============================================================================

export type PerturbationStrategy = (
  rank: number,
  studentIdx: number,
  topicIdx: number,
  iteration: number
) => number

/**
 * Gaussian perturbation with controllable variance
 */
export const gaussianPerturbation = (stdDev: number = 0.1): PerturbationStrategy => {
  return (rank: number, studentIdx: number, topicIdx: number, iteration: number) => {
    // Box-Muller transform for normal distribution
    const u1 = pseudoRandom(studentIdx, topicIdx, iteration, 1)
    const u2 = pseudoRandom(studentIdx, topicIdx, iteration, 2)
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

    const noise = z0 * stdDev * rank
    return Math.max(1, rank + noise)
  }
}

/**
 * Uniform perturbation with fixed range
 */
export const uniformPerturbation = (range: number = 0.2): PerturbationStrategy => {
  return (rank: number, studentIdx: number, topicIdx: number, iteration: number) => {
    const random = pseudoRandom(studentIdx, topicIdx, iteration, 1)
    const noise = (random - 0.5) * 2 * range * rank
    return Math.max(1, rank + noise)
  }
}

/**
 * Exponential decay perturbation - less noise for top choices
 */
export const exponentialPerturbation = (base: number = 0.5): PerturbationStrategy => {
  return (rank: number, studentIdx: number, topicIdx: number, iteration: number) => {
    const random = pseudoRandom(studentIdx, topicIdx, iteration, 1)
    const noise = (random - 0.5) * Math.pow(base, rank - 1) * rank
    return Math.max(1, rank + noise)
  }
}

/**
 * No perturbation - for deterministic testing
 */
export const noPerturbation: PerturbationStrategy = (rank) => rank

/**
 * Deterministic pseudo-random number generator
 */
function pseudoRandom(a: number, b: number, c: number, d: number): number {
  const hash = ((a * 31 + b * 37 + c * 41 + d * 43) >>> 0) / 0xFFFFFFFF
  return hash
}

// ============================================================================
// Aggregation Strategies - How to combine multiple runs
// ============================================================================

export type AggregationStrategy = (
  assignments: Assignment[][],
  numStudents: number,
  numTopics: number
) => number[][]

/**
 * Simple frequency counting
 */
export const frequencyAggregation: AggregationStrategy = (
  assignments: Assignment[][],
  numStudents: number,
  numTopics: number
) => {
  const counts = Array(numStudents).fill(null).map(() =>
    new Float32Array(numTopics)
  )

  for (const iteration of assignments) {
    for (const assignment of iteration) {
      counts[assignment.studentIndex][assignment.topicIndex]++
    }
  }

  // Normalize to probabilities
  const probabilities = Array(numStudents).fill(null).map(() =>
    Array(numTopics).fill(0)
  )

  for (let s = 0; s < numStudents; s++) {
    const total = Math.max(1, assignments.length) // Avoid division by zero
    for (let t = 0; t < numTopics; t++) {
      probabilities[s][t] = counts[s][t] / total
    }
  }

  return probabilities
}

/**
 * Weighted aggregation - recent iterations matter more
 */
export const weightedAggregation = (decay: number = 0.95): AggregationStrategy => {
  return (assignments: Assignment[][], numStudents: number, numTopics: number) => {
    const weights = Array(numStudents).fill(null).map(() =>
      new Float32Array(numTopics)
    )

    let totalWeight = 0
    for (let i = 0; i < assignments.length; i++) {
      const weight = Math.pow(decay, assignments.length - 1 - i)
      totalWeight += weight

      for (const assignment of assignments[i]) {
        weights[assignment.studentIndex][assignment.topicIndex] += weight
      }
    }

    // Normalize
    const probabilities = Array(numStudents).fill(null).map(() =>
      Array(numTopics).fill(0)
    )

    for (let s = 0; s < numStudents; s++) {
      for (let t = 0; t < numTopics; t++) {
        probabilities[s][t] = weights[s][t] / Math.max(1, totalWeight)
      }
    }

    return probabilities
  }
}

// ============================================================================
// Cache Strategy - Composable caching layer
// ============================================================================

export interface CacheStrategy {
  get(key: string): ProbabilityMatrix | null
  set(key: string, value: ProbabilityMatrix): void
  clear(): void
}

export class LRUCache implements CacheStrategy {
  private cache = new Map<string, { value: ProbabilityMatrix; timestamp: number }>()
  private maxSize: number
  private ttlMs: number

  constructor(maxSize: number = 100, ttlMs: number = ALLOCATION_CONSTANTS.CACHE_TTL_MS) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  get(key: string): ProbabilityMatrix | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: string, value: ProbabilityMatrix): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

export class NoCache implements CacheStrategy {
  get(_key: string): ProbabilityMatrix | null { return null }
  set(_key: string, _value: ProbabilityMatrix): void {}
  clear(): void {}
}

// ============================================================================
// Main Probability Calculator - Composable and configurable
// ============================================================================

export interface ProbabilityCalculatorConfig {
  iterations?: number
  perturbation?: PerturbationStrategy
  aggregation?: AggregationStrategy
  cache?: CacheStrategy
  regretStrategy?: RegretStrategy
  parallel?: boolean
  batchSize?: number
}

export class ProbabilityCalculator {
  private config: Required<ProbabilityCalculatorConfig>
  private allocator: HungarianAllocator

  constructor(
    numStudents: number,
    numTopics: number,
    topicIds: Id<"topics">[],
    capacities?: number[],
    config?: ProbabilityCalculatorConfig
  ) {
    this.allocator = new HungarianAllocator(numStudents, numTopics, topicIds, capacities)

    // Set defaults
    this.config = {
      iterations: config?.iterations ?? ALLOCATION_CONSTANTS.DEFAULT_ITERATIONS,
      perturbation: config?.perturbation ?? gaussianPerturbation(0.1),
      aggregation: config?.aggregation ?? frequencyAggregation,
      cache: config?.cache ?? new LRUCache(),
      regretStrategy: config?.regretStrategy ?? "squared",
      parallel: config?.parallel ?? false,
      batchSize: config?.batchSize ?? 10
    }
  }

  /**
   * Calculate probability matrix with caching
   */
  async calculate(preferences: StudentPreference[]): Promise<ProbabilityMatrix> {
    // Check cache
    const cacheKey = this.getCacheKey(preferences)
    const cached = this.config.cache.get(cacheKey)
    if (cached) return cached

    // Run calculation
    const result = this.config.parallel
      ? await this.calculateParallel(preferences)
      : await this.calculateSequential(preferences)

    // Cache result
    this.config.cache.set(cacheKey, result)

    return result
  }

  /**
   * Sequential Monte Carlo simulation
   */
  private async calculateSequential(
    preferences: StudentPreference[]
  ): Promise<ProbabilityMatrix> {
    const assignments: Assignment[][] = []

    for (let iter = 0; iter < this.config.iterations; iter++) {
      const perturbed = this.perturbPreferences(preferences, iter)
      const { assignments: iterAssignments } = this.allocator.solve(
        perturbed,
        this.config.regretStrategy
      )

      // Convert to simple assignments
      const simpleAssignments = iterAssignments.map(a => {
        const studentIdx = preferences.findIndex(p => p.studentId === a.studentId)
        const topicIdx = this.allocator['topicIds'].indexOf(a.topicId)
        return {
          studentIndex: studentIdx,
          topicIndex: topicIdx,
          regret: a.regret
        }
      })

      assignments.push(simpleAssignments)

      // Yield to event loop periodically
      if (iter % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // Aggregate results
    const probabilities = this.config.aggregation(
      assignments,
      preferences.length,
      this.allocator['numTopics']
    )

    return {
      studentIds: preferences.map(p => p.studentId),
      probabilities
    }
  }

  /**
   * Parallel Monte Carlo simulation using batches
   */
  private async calculateParallel(
    preferences: StudentPreference[]
  ): Promise<ProbabilityMatrix> {
    const batches = Math.ceil(this.config.iterations / this.config.batchSize)
    const allAssignments: Assignment[][] = []

    const batchPromises = Array.from({ length: batches }, async (_, batchIdx) => {
      const startIter = batchIdx * this.config.batchSize
      const endIter = Math.min(startIter + this.config.batchSize, this.config.iterations)
      const batchAssignments: Assignment[][] = []

      for (let iter = startIter; iter < endIter; iter++) {
        const perturbed = this.perturbPreferences(preferences, iter)
        const { assignments } = this.allocator.solve(perturbed, this.config.regretStrategy)

        const simpleAssignments = assignments.map(a => {
          const studentIdx = preferences.findIndex(p => p.studentId === a.studentId)
          const topicIdx = this.allocator['topicIds'].indexOf(a.topicId)
          return {
            studentIndex: studentIdx,
            topicIndex: topicIdx,
            regret: a.regret
          }
        })

        batchAssignments.push(simpleAssignments)
      }

      return batchAssignments
    })

    // Wait for all batches
    const batchResults = await Promise.all(batchPromises)
    for (const batch of batchResults) {
      allAssignments.push(...batch)
    }

    // Aggregate results
    const probabilities = this.config.aggregation(
      allAssignments,
      preferences.length,
      this.allocator['numTopics']
    )

    return {
      studentIds: preferences.map(p => p.studentId),
      probabilities
    }
  }

  /**
   * Apply perturbation to preferences
   */
  private perturbPreferences(
    preferences: StudentPreference[],
    iteration: number
  ): StudentPreference[] {
    return preferences.map((pref, studentIdx) => ({
      studentId: pref.studentId,
      rankings: pref.rankings.map((rank, topicIdx) =>
        this.config.perturbation(rank, studentIdx, topicIdx, iteration)
      )
    }))
  }

  /**
   * Generate cache key from preferences
   */
  private getCacheKey(preferences: StudentPreference[]): string {
    let hash = 0
    for (const pref of preferences) {
      for (const rank of pref.rankings) {
        hash = ((hash << 5) - hash + rank) | 0
      }
    }
    return `${hash}_${this.config.iterations}_${this.config.regretStrategy}`
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProbabilityCalculatorConfig>): void {
    Object.assign(this.config, config)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.config.cache.clear()
  }
}

// ============================================================================
// Probability Analysis Utilities
// ============================================================================

export interface ProbabilityAnalysis {
  certainty: number[]      // How certain each student's assignment is
  competition: number[]     // How competitive each topic is
  stability: number         // Overall system stability
  expectedRegret: number    // Expected total regret
}

export function analyzeProbabilities(
  matrix: ProbabilityMatrix,
  preferences: StudentPreference[],
  regretStrategy: RegretStrategy = "squared"
): ProbabilityAnalysis {
  const numStudents = matrix.studentIds.length
  const numTopics = matrix.probabilities[0].length

  // Calculate certainty for each student (max probability)
  const certainty = matrix.probabilities.map(probs => Math.max(...probs))

  // Calculate competition for each topic (entropy)
  const competition = Array(numTopics).fill(0).map((_, t) => {
    let entropy = 0
    for (let s = 0; s < numStudents; s++) {
      const p = matrix.probabilities[s][t]
      if (p > 0) {
        entropy -= p * Math.log2(p)
      }
    }
    return entropy
  })

  // Calculate overall stability (average certainty)
  const stability = certainty.reduce((a, b) => a + b, 0) / numStudents

  // Calculate expected regret
  let expectedRegret = 0
  for (let s = 0; s < numStudents; s++) {
    for (let t = 0; t < numTopics; t++) {
      const prob = matrix.probabilities[s][t]
      const rank = preferences[s].rankings[t]
      const regret = rankToRegret(rank, regretStrategy)
      expectedRegret += prob * regret
    }
  }

  return {
    certainty,
    competition,
    stability,
    expectedRegret
  }
}

/**
 * Convert rank to regret value
 */
function rankToRegret(rank: number, strategy: RegretStrategy): number {
  switch (strategy) {
    case "linear":
      return rank - 1
    case "squared":
      return (rank - 1) * (rank - 1)
    case "exponential":
      return Math.pow(2, rank - 1) - 1
    default:
      return (rank - 1) * (rank - 1)
  }
}

// ============================================================================
// Probability Visualization Helpers
// ============================================================================

export interface StudentProbabilityView {
  studentId: string
  topProbabilities: Array<{
    topicIndex: number
    probability: number
    rank: number
  }>
  expectedRank: number
  uncertainty: number
}

export function getStudentView(
  matrix: ProbabilityMatrix,
  studentId: string,
  preferences: StudentPreference[],
  topK: number = 5
): StudentProbabilityView | null {
  const studentIdx = matrix.studentIds.indexOf(studentId)
  if (studentIdx === -1) return null

  const studentPref = preferences[studentIdx]
  const probs = matrix.probabilities[studentIdx]

  // Get top K probabilities
  const topProbabilities = probs
    .map((prob, topicIdx) => ({
      topicIndex: topicIdx,
      probability: prob,
      rank: studentPref.rankings[topicIdx]
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topK)

  // Calculate expected rank
  const expectedRank = probs.reduce((sum, prob, topicIdx) => {
    return sum + prob * studentPref.rankings[topicIdx]
  }, 0)

  // Calculate uncertainty (entropy)
  const uncertainty = -probs.reduce((sum, prob) => {
    return prob > 0 ? sum + prob * Math.log2(prob) : sum
  }, 0)

  return {
    studentId,
    topProbabilities,
    expectedRank,
    uncertainty
  }
}