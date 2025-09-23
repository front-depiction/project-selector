import munkres from "munkres-js"
import type {
  StudentPreference,
  Assignment,
  AllocationAssignment,
  AllocationStatistics,
  RegretStrategy
} from "./types"
import { ALLOCATION_CONSTANTS } from "./types"
import type { Id } from "../_generated/dataModel"

// ============================================================================
// Hungarian Algorithm Implementation
// ============================================================================

export class HungarianAllocator {
  private costMatrix: number[][]
  private numStudents: number
  private numTopics: number
  private capacities: number[]
  private topicIds: Id<"topics">[]

  constructor(
    numStudents: number,
    numTopics: number,
    topicIds: Id<"topics">[],
    capacities?: number[]
  ) {
    this.numStudents = numStudents
    this.numTopics = numTopics
    this.topicIds = topicIds

    // Default: evenly distribute students across topics
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

    // Pre-allocate cost matrix for performance
    this.costMatrix = Array(numStudents)
      .fill(null)
      .map(() => Array(numTopics).fill(0))
  }

  /**
   * Convert rank to regret based on strategy
   */
  private rankToRegret(rank: number, strategy: RegretStrategy = "squared"): number {
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

  /**
   * Build cost matrix from preferences
   */
  buildCostMatrix(
    preferences: StudentPreference[],
    strategy: RegretStrategy = "squared"
  ): void {
    for (let i = 0; i < this.numStudents; i++) {
      for (let j = 0; j < this.numTopics; j++) {
        const rank = preferences[i].rankings[j]
        // High penalty for unranked topics (shouldn't happen with complete rankings)
        this.costMatrix[i][j] = rank
          ? this.rankToRegret(rank, strategy)
          : ALLOCATION_CONSTANTS.INFINITY
      }
    }
  }

  /**
   * Expand matrix to handle multiple slots per topic
   */
  private expandMatrixForCapacities(): number[][] {
    const totalSlots = this.capacities.reduce((sum, cap) => sum + cap, 0)
    const expanded: number[][] = []

    // Create expanded matrix where each topic has multiple columns
    for (let s = 0; s < this.numStudents; s++) {
      const row: number[] = []
      for (let t = 0; t < this.numTopics; t++) {
        // Add columns for each slot in this topic
        for (let slot = 0; slot < this.capacities[t]; slot++) {
          row.push(this.costMatrix[s][t])
        }
      }
      expanded.push(row)
    }

    // Add dummy students if needed (with zero cost)
    while (expanded.length < totalSlots) {
      expanded.push(new Array(totalSlots).fill(0))
    }

    return expanded
  }

  /**
   * Map expanded column index back to topic index
   */
  private getTopicFromColumn(columnIndex: number): number {
    let currentCol = 0
    for (let t = 0; t < this.numTopics; t++) {
      currentCol += this.capacities[t]
      if (columnIndex < currentCol) {
        return t
      }
    }
    return this.numTopics - 1
  }

  /**
   * Run the Hungarian algorithm to find optimal allocation
   */
  solve(preferences: StudentPreference[], strategy: RegretStrategy = "squared"): {
    assignments: AllocationAssignment[]
    statistics: AllocationStatistics
  } {
    // Build cost matrix
    this.buildCostMatrix(preferences, strategy)

    // Expand matrix for capacities
    const expandedMatrix = this.expandMatrixForCapacities()

    // Run munkres algorithm
    const startTime = performance.now()
    const munkresAssignments = munkres(expandedMatrix)
    const computationTime = performance.now() - startTime

    // Convert assignments back to student-topic mapping
    const assignments: AllocationAssignment[] = []
    let totalRegret = 0
    let maxRegret = 0
    const rankCounts = new Map<number, number>()

    for (const [studentIdx, columnIdx] of munkresAssignments) {
      // Skip dummy students
      if (studentIdx >= this.numStudents) continue

      const topicIdx = this.getTopicFromColumn(columnIdx)
      const student = preferences[studentIdx]
      const rank = student.rankings[topicIdx]
      const regret = this.rankToRegret(rank, strategy)

      assignments.push({
        studentId: student.studentId,
        topicId: this.topicIds[topicIdx],
        rank,
        regret
      })

      totalRegret += regret
      maxRegret = Math.max(maxRegret, regret)
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1)
    }

    // Build rank distribution
    const rankDistribution = Array.from(rankCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rank, count]) => ({ rank, count }))

    const statistics: AllocationStatistics = {
      totalRegret,
      averageRegret: totalRegret / this.numStudents,
      maxRegret,
      rankDistribution
    }

    console.log(`Allocation completed in ${computationTime.toFixed(2)}ms`)

    return { assignments, statistics }
  }

  /**
   * Fast allocation using pre-built cost matrix (for probability calculations)
   */
  solveWithMatrix(costMatrix: number[][]): Assignment[] {
    // Use munkres directly on provided matrix
    const munkresAssignments = munkres(costMatrix)

    const assignments: Assignment[] = []
    for (const [studentIdx, topicIdx] of munkresAssignments) {
      if (studentIdx < this.numStudents && topicIdx < this.numTopics) {
        assignments.push({
          studentIndex: studentIdx,
          topicIndex: topicIdx,
          regret: costMatrix[studentIdx][topicIdx]
        })
      }
    }

    return assignments
  }
}

// ============================================================================
// Performance-Optimized Allocator for Large Scale
// ============================================================================

export class FastHungarianAllocator {
  private numStudents: number
  private numTopics: number
  private totalSlots: number

  // Pre-allocated typed arrays for performance
  private costMatrix: Float32Array
  private u: Float32Array // Dual variables for rows
  private v: Float32Array // Dual variables for columns
  private assignment: Int32Array
  private inverseAssignment: Int32Array

  constructor(numStudents: number, numTopics: number, capacities: number[]) {
    this.numStudents = numStudents
    this.numTopics = numTopics
    this.totalSlots = capacities.reduce((sum, cap) => sum + cap, 0)

    // Pre-allocate all arrays
    const size = Math.max(numStudents, this.totalSlots)
    this.costMatrix = new Float32Array(size * size)
    this.u = new Float32Array(size)
    this.v = new Float32Array(size)
    this.assignment = new Int32Array(size).fill(-1)
    this.inverseAssignment = new Int32Array(size).fill(-1)
  }

  /**
   * Build cost matrix in flat array format
   */
  buildFlatCostMatrix(
    preferences: StudentPreference[],
    capacities: number[],
    strategy: RegretStrategy = "squared"
  ): void {
    const size = Math.max(this.numStudents, this.totalSlots)

    // Initialize with high cost
    this.costMatrix.fill(ALLOCATION_CONSTANTS.INFINITY)

    // Fill actual costs
    let colOffset = 0
    for (let t = 0; t < this.numTopics; t++) {
      for (let slot = 0; slot < capacities[t]; slot++) {
        for (let s = 0; s < this.numStudents; s++) {
          const rank = preferences[s].rankings[t]
          const cost = rank
            ? this.rankToRegret(rank, strategy)
            : ALLOCATION_CONSTANTS.INFINITY

          this.costMatrix[s * size + colOffset] = cost
        }
        colOffset++
      }
    }
  }

  /**
   * Fast Hungarian implementation with typed arrays
   */
  solveFast(): Assignment[] {
    const size = Math.max(this.numStudents, this.totalSlots)

    // Initialize dual variables
    for (let i = 0; i < size; i++) {
      this.u[i] = 0
      this.v[i] = 0

      // Row reduction
      let minCost = ALLOCATION_CONSTANTS.INFINITY
      for (let j = 0; j < size; j++) {
        minCost = Math.min(minCost, this.costMatrix[i * size + j])
      }
      this.u[i] = minCost
    }

    // Main Hungarian algorithm loop
    for (let row = 0; row < size; row++) {
      this.findAugmentingPath(row, size)
    }

    // Extract assignments
    const assignments: Assignment[] = []
    for (let i = 0; i < this.numStudents; i++) {
      const j = this.assignment[i]
      if (j >= 0 && j < this.totalSlots) {
        assignments.push({
          studentIndex: i,
          topicIndex: this.getTopicFromSlot(j),
          regret: this.costMatrix[i * size + j]
        })
      }
    }

    return assignments
  }

  /**
   * Find augmenting path using BFS
   */
  private findAugmentingPath(startRow: number, size: number): void {
    const visited = new Uint8Array(size)
    const parent = new Int32Array(size).fill(-1)
    const queue = new Uint32Array(size)
    let queueStart = 0
    let queueEnd = 0

    // BFS to find augmenting path
    queue[queueEnd++] = startRow
    visited[startRow] = 1

    while (queueStart < queueEnd) {
      const row = queue[queueStart++]

      for (let col = 0; col < size; col++) {
        const reducedCost = this.costMatrix[row * size + col] - this.u[row] - this.v[col]

        if (Math.abs(reducedCost) < 1e-6 && !visited[col]) {
          parent[col] = row

          if (this.inverseAssignment[col] === -1) {
            // Found augmenting path, update assignments
            this.updateAssignments(col, parent)
            return
          }

          visited[col] = 1
          queue[queueEnd++] = this.inverseAssignment[col]
        }
      }
    }
  }

  /**
   * Update assignments along augmenting path
   */
  private updateAssignments(endCol: number, parent: Int32Array): void {
    let col = endCol
    while (col !== -1) {
      const row = parent[col]
      const prevCol = this.assignment[row]

      this.assignment[row] = col
      this.inverseAssignment[col] = row

      col = prevCol
    }
  }

  /**
   * Map slot index back to topic index
   */
  private getTopicFromSlot(slot: number): number {
    // This would need capacities array to be stored
    // For now, return slot modulo numTopics as approximation
    return slot % this.numTopics
  }

  /**
   * Convert rank to regret
   */
  private rankToRegret(rank: number, strategy: RegretStrategy = "squared"): number {
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
}