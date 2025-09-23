import type {
  StudentPreference,
  AllocationAssignment,
  AllocationStatistics,
  RankCount
} from "./types"
import { ALLOCATION_CONSTANTS } from "./types"

// ============================================================================
// Capacity Distribution
// ============================================================================

/**
 * Distribute capacity evenly across topics
 */
export function distributeCapacity(
  numStudents: number,
  numTopics: number
): number[] {
  const capacities = new Array(numTopics)
  const base = Math.floor(numStudents / numTopics)
  const remainder = numStudents % numTopics

  // Fill base capacity
  for (let i = 0; i < numTopics; i++) {
    capacities[i] = base
  }

  // Distribute remainder to first topics
  for (let i = 0; i < remainder; i++) {
    capacities[i]++
  }

  return capacities
}

/**
 * Validate that total capacity can accommodate all students
 */
export function validateCapacity(
  numStudents: number,
  capacities: number[]
): boolean {
  const totalCapacity = capacities.reduce((sum, cap) => sum + cap, 0)
  return totalCapacity >= numStudents
}

// ============================================================================
// Statistics Calculation
// ============================================================================

/**
 * Calculate allocation statistics from assignments
 */
export function calculateStatistics(
  assignments: AllocationAssignment[]
): AllocationStatistics {
  if (assignments.length === 0) {
    return {
      totalRegret: 0,
      averageRegret: 0,
      maxRegret: 0,
      rankDistribution: []
    }
  }

  let totalRegret = 0
  let maxRegret = 0
  const rankCounts = new Map<number, number>()

  for (const assignment of assignments) {
    totalRegret += assignment.regret
    maxRegret = Math.max(maxRegret, assignment.regret)
    rankCounts.set(assignment.rank, (rankCounts.get(assignment.rank) || 0) + 1)
  }

  const rankDistribution: RankCount[] = Array.from(rankCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rank, count]) => ({ rank, count }))

  return {
    totalRegret,
    averageRegret: totalRegret / assignments.length,
    maxRegret,
    rankDistribution
  }
}

/**
 * Get percentage of students who got their top N choices
 */
export function getTopNPercentage(
  assignments: AllocationAssignment[],
  n: number
): number {
  if (assignments.length === 0) return 0

  const topNCount = assignments.filter(a => a.rank <= n).length
  return (topNCount / assignments.length) * 100
}

// ============================================================================
// Preference Validation
// ============================================================================

/**
 * Validate student preferences
 */
export function validatePreferences(
  preferences: StudentPreference[],
  numTopics: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const pref of preferences) {
    // Check if rankings array has correct length
    if (pref.rankings.length !== numTopics) {
      errors.push(
        `Student ${pref.studentId} has ${pref.rankings.length} rankings but there are ${numTopics} topics`
      )
    }

    // Check for valid rank values (1 to numTopics)
    const validRanks = new Set<number>()
    for (let i = 0; i < pref.rankings.length; i++) {
      const rank = pref.rankings[i]

      if (rank < 1 || rank > numTopics) {
        errors.push(
          `Student ${pref.studentId} has invalid rank ${rank} for topic ${i}`
        )
      }

      if (validRanks.has(rank)) {
        errors.push(
          `Student ${pref.studentId} has duplicate rank ${rank}`
        )
      }

      validRanks.add(rank)
    }

    // Check that all ranks are present
    if (validRanks.size !== numTopics) {
      errors.push(
        `Student ${pref.studentId} is missing some ranks`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================================================
// Performance Helpers
// ============================================================================

/**
 * Batch process large arrays efficiently
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)
  }

  return results
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = ALLOCATION_CONSTANTS.MAX_RETRIES
): Promise<T> {
  let lastError: Error = new Error("Unknown error")

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on permanent errors
      if (error instanceof Error) {
        if (error.message.includes("INVALID_INPUT") ||
            error.message.includes("UNAUTHORIZED")) {
          throw error
        }
      }

      // Exponential backoff
      const delay = Math.pow(2, i) * 100
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// ============================================================================
// Random Data Generation (for testing)
// ============================================================================

/**
 * Generate random preferences for testing
 */
export function generateRandomPreferences(
  numStudents: number,
  numTopics: number
): StudentPreference[] {
  const preferences: StudentPreference[] = []

  for (let i = 0; i < numStudents; i++) {
    // Create a random ranking by shuffling 1 to numTopics
    const rankings = Array.from({ length: numTopics }, (_, idx) => idx + 1)

    // Fisher-Yates shuffle
    for (let j = rankings.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [rankings[j], rankings[k]] = [rankings[k], rankings[j]]
    }

    preferences.push({
      studentId: `student_${i}`,
      rankings
    })
  }

  return preferences
}

/**
 * Generate clustered preferences (some topics more popular)
 */
export function generateClusteredPreferences(
  numStudents: number,
  numTopics: number,
  popularityBias: number = 0.3
): StudentPreference[] {
  const preferences: StudentPreference[] = []

  // Make first few topics more popular
  const popularTopics = Math.floor(numTopics * popularityBias)

  for (let i = 0; i < numStudents; i++) {
    const rankings = Array.from({ length: numTopics }, (_, idx) => idx + 1)

    // Bias towards popular topics
    if (Math.random() < 0.7) {
      // 70% chance to prefer popular topics
      for (let j = 0; j < popularTopics; j++) {
        const swapWith = Math.floor(Math.random() * popularTopics);
        [rankings[j], rankings[swapWith]] = [rankings[swapWith], rankings[j]]
      }
    } else {
      // 30% chance for completely random
      for (let j = rankings.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [rankings[j], rankings[k]] = [rankings[k], rankings[j]]
      }
    }

    preferences.push({
      studentId: `student_${i}`,
      rankings
    })
  }

  return preferences
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format allocation results for display
 */
export function formatAllocationResults(
  assignments: AllocationAssignment[],
  statistics: AllocationStatistics
): string {
  const lines: string[] = []

  lines.push("=== ALLOCATION RESULTS ===")
  lines.push(`Total Students: ${assignments.length}`)
  lines.push(`Total Regret: ${statistics.totalRegret.toFixed(2)}`)
  lines.push(`Average Regret: ${statistics.averageRegret.toFixed(2)}`)
  lines.push(`Maximum Regret: ${statistics.maxRegret.toFixed(2)}`)
  lines.push("")

  lines.push("=== RANK DISTRIBUTION ===")
  for (const { rank, count } of statistics.rankDistribution) {
    const percentage = ((count / assignments.length) * 100).toFixed(1)
    const bar = "█".repeat(Math.floor(count / 2))
    lines.push(`Rank ${rank}: ${bar} ${count} students (${percentage}%)`)
  }

  // Calculate key metrics
  const top3Percentage = getTopNPercentage(assignments, 3)
  lines.push("")
  lines.push("=== KEY METRICS ===")
  lines.push(`Students getting top 3 choices: ${top3Percentage.toFixed(1)}%`)

  return lines.join("\n")
}

/**
 * Export results to CSV format
 */
export function exportToCSV(assignments: AllocationAssignment[]): string {
  const headers = ["Student ID", "Topic ID", "Rank", "Regret"]
  const rows = assignments.map(a => [
    a.studentId,
    a.topicId,
    a.rank.toString(),
    a.regret.toFixed(2)
  ])

  const csvLines = [headers, ...rows].map(row => row.join(","))
  return csvLines.join("\n")
}