# Least Regret Allocation - Technical Design

## Architecture Overview

The least regret allocation system consists of three main components:
1. **Core Algorithm Module** - Hungarian algorithm implementation with performance optimizations
2. **Scheduling System** - Automatic execution management with deduplication
3. **Probability Engine** - Monte Carlo simulations for real-time probability estimates

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌──────────────────┐              ┌────────────────────┐  │
│  │ Student Rankings │              │  Admin Dashboard   │  │
│  │  + Probabilities │              │   + Statistics     │  │
│  └──────────────────┘              └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Convex Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  API Layer (Mutations/Queries)        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │ Scheduling Engine│  │Algorithm Core│  │Probability │   │
│  │                  │  │              │  │   Engine   │   │
│  └──────────────────┘  └──────────────┘  └────────────┘   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (Tables)                        │  │
│  │  • allocationSchedules  • allocationResults          │  │
│  │  • probabilityDistributions  • preferences           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Module Structure

```
convex/
├── allocation/
│   ├── algorithm.ts         # Core Hungarian algorithm implementation
│   ├── scheduler.ts         # Scheduling and deduplication logic
│   ├── probability.ts       # Monte Carlo simulation engine
│   ├── types.ts            # Shared types and validators
│   └── utils.ts            # Helper functions (capacity distribution, etc.)
├── mutations/
│   ├── runAllocation.ts    # Manual allocation trigger
│   └── scheduleAllocation.ts # Automatic scheduling
├── queries/
│   ├── getStudentProbabilities.ts
│   └── getAllocationStats.ts
├── scheduledFunctions/
│   └── executeAllocation.ts
└── schema.ts               # Updated with new tables
```

## Core Algorithm Design

### Performance-Optimized Hungarian Implementation

```typescript
// algorithm.ts - Mutable arrays for performance
export class HungarianAllocator {
  private costMatrix: number[][]
  private numStudents: number
  private numTopics: number
  private INF = 1e9

  constructor(numStudents: number, numTopics: number) {
    this.numStudents = numStudents
    this.numTopics = numTopics
    // Pre-allocate matrix for performance
    this.costMatrix = Array(numStudents)
      .fill(null)
      .map(() => Array(numTopics).fill(0))
  }

  // Build cost matrix with squared regret - mutates for performance
  buildCostMatrix(preferences: StudentPreference[]): void {
    for (let i = 0; i < this.numStudents; i++) {
      for (let j = 0; j < this.numTopics; j++) {
        const rank = preferences[i].rankings[j]
        this.costMatrix[i][j] = (rank - 1) * (rank - 1) // squared regret
      }
    }
  }

  // Optimized Hungarian algorithm with mutable state
  solve(): Assignment[] {
    const n = Math.max(this.numStudents, this.numTopics)

    // Expand matrix to square if needed
    const matrix = this.expandToSquare(n)

    // Hungarian algorithm steps - all mutating for speed
    const rowMin = new Float32Array(n)
    const colMin = new Float32Array(n)
    const rowCovered = new Uint8Array(n)
    const colCovered = new Uint8Array(n)
    const assignment = new Int32Array(n).fill(-1)

    // Step 1: Row reduction
    for (let i = 0; i < n; i++) {
      rowMin[i] = Math.min(...matrix[i])
      for (let j = 0; j < n; j++) {
        matrix[i][j] -= rowMin[i]
      }
    }

    // Step 2: Column reduction
    for (let j = 0; j < n; j++) {
      colMin[j] = this.INF
      for (let i = 0; i < n; i++) {
        colMin[j] = Math.min(colMin[j], matrix[i][j])
      }
      for (let i = 0; i < n; i++) {
        matrix[i][j] -= colMin[j]
      }
    }

    // Step 3: Find initial assignment using greedy approach
    this.greedyAssignment(matrix, assignment, rowCovered, colCovered, n)

    // Step 4: Optimize using augmenting paths
    this.optimizeAssignment(matrix, assignment, rowCovered, colCovered, n)

    // Convert back to student-topic assignments
    return this.extractAssignments(assignment)
  }

  // Fast greedy initial assignment
  private greedyAssignment(
    matrix: number[][],
    assignment: Int32Array,
    rowCovered: Uint8Array,
    colCovered: Uint8Array,
    n: number
  ): void {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 0 && !rowCovered[i] && !colCovered[j]) {
          assignment[i] = j
          rowCovered[i] = 1
          colCovered[j] = 1
          break
        }
      }
    }
  }

  // Kuhn-Munkres optimization
  private optimizeAssignment(
    matrix: number[][],
    assignment: Int32Array,
    rowCovered: Uint8Array,
    colCovered: Uint8Array,
    n: number
  ): void {
    // Implementation of augmenting path algorithm
    // Using BFS for better cache locality
    const queue = new Uint32Array(n * n)
    const visited = new Uint8Array(n)

    // ... optimization logic ...
  }

  private expandToSquare(size: number): number[][] {
    const expanded = Array(size).fill(null).map(() => Array(size).fill(this.INF))

    for (let i = 0; i < this.numStudents; i++) {
      for (let j = 0; j < this.numTopics; j++) {
        expanded[i][j] = this.costMatrix[i][j]
      }
    }

    return expanded
  }

  private extractAssignments(assignment: Int32Array): Assignment[] {
    const results: Assignment[] = []

    for (let i = 0; i < this.numStudents; i++) {
      if (assignment[i] < this.numTopics) {
        results.push({
          studentIndex: i,
          topicIndex: assignment[i],
          regret: this.costMatrix[i][assignment[i]]
        })
      }
    }

    return results
  }
}
```

### Capacity Balancing Strategy

```typescript
// utils.ts
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

  // Distribute remainder
  for (let i = 0; i < remainder; i++) {
    capacities[i]++
  }

  return capacities
}

// Handle multiple slots per topic
export function expandMatrixForCapacities(
  costMatrix: number[][],
  capacities: number[]
): number[][] {
  const students = costMatrix.length
  const totalSlots = capacities.reduce((sum, cap) => sum + cap, 0)
  const expanded = Array(students).fill(null).map(() => Array(totalSlots))

  let colIndex = 0
  for (let topic = 0; topic < capacities.length; topic++) {
    for (let slot = 0; slot < capacities[topic]; slot++) {
      for (let student = 0; student < students; student++) {
        expanded[student][colIndex] = costMatrix[student][topic]
      }
      colIndex++
    }
  }

  return expanded
}
```

## Scheduling System Design

### Deduplication and Scheduling

```typescript
// scheduler.ts
import { cronJobs } from "convex/server"

export class AllocationScheduler {
  // Check and create schedule with deduplication
  static async scheduleIfNeeded(
    ctx: MutationCtx,
    selectionPeriodId: Id<"selectionPeriods">,
    delayMs: number = 60000 // 1 minute default
  ): Promise<void> {
    // Check for existing pending schedule
    const existing = await ctx.db
      .query("allocationSchedules")
      .withIndex("byPeriodAndStatus", q =>
        q.eq("selectionPeriodId", selectionPeriodId)
         .eq("status", "pending")
      )
      .first()

    if (existing) {
      // Update execution time if later
      const newExecuteAt = Date.now() + delayMs
      if (newExecuteAt > existing.executeAt) {
        await ctx.db.patch(existing._id, {
          executeAt: newExecuteAt,
          scheduledAt: Date.now()
        })

        // Reschedule the cron job
        await ctx.scheduler.cancel(existing.jobId)
        const jobId = await ctx.scheduler.runAfter(
          delayMs,
          "scheduledFunctions:executeAllocation",
          { scheduleId: existing._id }
        )

        await ctx.db.patch(existing._id, { jobId })
      }
      return
    }

    // Create new schedule
    const scheduleId = await ctx.db.insert("allocationSchedules", {
      selectionPeriodId,
      scheduledAt: Date.now(),
      executeAt: Date.now() + delayMs,
      status: "pending",
      version: 1
    })

    // Schedule execution
    const jobId = await ctx.scheduler.runAfter(
      delayMs,
      "scheduledFunctions:executeAllocation",
      { scheduleId }
    )

    await ctx.db.patch(scheduleId, { jobId })
  }

  // Execute scheduled allocation
  static async execute(
    ctx: MutationCtx,
    scheduleId: Id<"allocationSchedules">
  ): Promise<void> {
    const schedule = await ctx.db.get(scheduleId)
    if (!schedule || schedule.status !== "pending") {
      return // Already processed or cancelled
    }

    // Mark as executing
    await ctx.db.patch(scheduleId, { status: "executing" })

    try {
      // Get current preferences
      const preferences = await ctx.db
        .query("preferences")
        .withIndex("byPeriod", q =>
          q.eq("selectionPeriodId", schedule.selectionPeriodId)
        )
        .collect()

      // Run allocation
      const startTime = performance.now()
      const allocator = new HungarianAllocator(
        preferences.length,
        await getTopicCount(ctx, schedule.selectionPeriodId)
      )

      allocator.buildCostMatrix(preferences)
      const assignments = allocator.solve()
      const computationTime = performance.now() - startTime

      // Calculate statistics
      const stats = calculateStats(assignments, preferences)

      // Store results
      await ctx.db.insert("allocationResults", {
        selectionPeriodId: schedule.selectionPeriodId,
        executedAt: Date.now(),
        assignments,
        ...stats,
        strategy: "squared",
        computationTimeMs: computationTime
      })

      // Run probability calculations in background
      await ctx.scheduler.runAfter(
        0,
        "scheduledFunctions:calculateProbabilities",
        { selectionPeriodId: schedule.selectionPeriodId }
      )

      // Mark as completed
      await ctx.db.patch(scheduleId, { status: "completed" })

    } catch (error) {
      await ctx.db.patch(scheduleId, {
        status: "failed",
        error: error.message
      })
      throw error
    }
  }
}
```

## Probability Engine Design

### Monte Carlo Simulation with Performance Optimizations

```typescript
// probability.ts
export class ProbabilityCalculator {
  private numStudents: number
  private numTopics: number
  private basePreferences: StudentPreference[]

  // Reusable buffers to avoid allocations
  private perturbedRankings: Float32Array
  private assignmentCounts: Uint16Array

  constructor(
    preferences: StudentPreference[],
    numTopics: number
  ) {
    this.numStudents = preferences.length
    this.numTopics = numTopics
    this.basePreferences = preferences

    // Pre-allocate buffers
    this.perturbedRankings = new Float32Array(this.numStudents * this.numTopics)
    this.assignmentCounts = new Uint16Array(this.numStudents * this.numTopics)
  }

  // Fast Monte Carlo with minimal allocations
  calculate(iterations: number = 100): ProbabilityMatrix {
    // Reset counts
    this.assignmentCounts.fill(0)

    // Pre-create allocator to reuse buffers
    const allocator = new HungarianAllocator(this.numStudents, this.numTopics)

    for (let iter = 0; iter < iterations; iter++) {
      // Perturb preferences in-place
      this.perturbInPlace(iter)

      // Run allocation
      allocator.buildCostMatrix(this.getPerturbedPreferences())
      const assignments = allocator.solve()

      // Update counts
      for (const assignment of assignments) {
        const index = assignment.studentIndex * this.numTopics + assignment.topicIndex
        this.assignmentCounts[index]++
      }
    }

    // Convert counts to probabilities
    return this.normalizeCounts(iterations)
  }

  // In-place perturbation for speed
  private perturbInPlace(seed: number): void {
    // Use simple deterministic noise for consistency
    const noise = 0.1 // 10% perturbation

    for (let s = 0; s < this.numStudents; s++) {
      for (let t = 0; t < this.numTopics; t++) {
        const index = s * this.numTopics + t
        const baseRank = this.basePreferences[s].rankings[t]

        // Add deterministic pseudo-random noise
        const hash = ((s * 31 + t * 37 + seed * 41) % 100) / 100
        const perturbation = (hash - 0.5) * 2 * noise

        this.perturbedRankings[index] = Math.max(1, baseRank + perturbation)
      }
    }
  }

  private getPerturbedPreferences(): StudentPreference[] {
    // Create view over perturbed data without allocation
    const preferences: StudentPreference[] = []

    for (let s = 0; s < this.numStudents; s++) {
      const rankings = []
      for (let t = 0; t < this.numTopics; t++) {
        rankings.push(this.perturbedRankings[s * this.numTopics + t])
      }
      preferences.push({
        studentId: this.basePreferences[s].studentId,
        rankings
      })
    }

    return preferences
  }

  private normalizeCounts(iterations: number): ProbabilityMatrix {
    const matrix: number[][] = []

    for (let s = 0; s < this.numStudents; s++) {
      const row: number[] = []
      for (let t = 0; t < this.numTopics; t++) {
        const index = s * this.numTopics + t
        row.push(this.assignmentCounts[index] / iterations)
      }
      matrix.push(row)
    }

    return {
      studentIds: this.basePreferences.map(p => p.studentId),
      probabilities: matrix
    }
  }
}

// Cached probability calculation to avoid redundant computation
export class ProbabilityCache {
  private cache: Map<string, ProbabilityMatrix> = new Map()
  private maxAge = 120000 // 2 minutes

  getCacheKey(preferences: StudentPreference[]): string {
    // Fast hash of preferences
    let hash = 0
    for (const pref of preferences) {
      for (const rank of pref.rankings) {
        hash = ((hash << 5) - hash + rank) | 0
      }
    }
    return hash.toString(36)
  }

  get(preferences: StudentPreference[]): ProbabilityMatrix | null {
    const key = this.getCacheKey(preferences)
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.matrix
    }

    return null
  }

  set(preferences: StudentPreference[], matrix: ProbabilityMatrix): void {
    const key = this.getCacheKey(preferences)
    this.cache.set(key, {
      matrix,
      timestamp: Date.now()
    })

    // Clean old entries
    if (this.cache.size > 100) {
      this.cleanOldEntries()
    }
  }

  private cleanOldEntries(): void {
    const now = Date.now()
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }
}
```

## Database Schema Updates

```typescript
// schema.ts additions
defineSchema({
  // ... existing tables ...

  allocationSchedules: defineTable({
    selectionPeriodId: v.id("selectionPeriods"),
    scheduledAt: v.number(),
    executeAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
    version: v.number(),
    jobId: v.optional(v.string()),
    error: v.optional(v.string())
  })
    .index("byPeriodAndStatus", ["selectionPeriodId", "status"])
    .index("byExecuteTime", ["executeAt", "status"]),

  allocationResults: defineTable({
    selectionPeriodId: v.id("selectionPeriods"),
    executedAt: v.number(),
    assignments: v.array(v.object({
      studentId: v.string(),
      topicId: v.id("topics"),
      rank: v.number(),
      regret: v.number()
    })),
    totalRegret: v.number(),
    averageRegret: v.number(),
    maxRegret: v.number(),
    rankDistribution: v.array(v.object({
      rank: v.number(),
      count: v.number()
    })),
    strategy: v.literal("squared"),
    computationTimeMs: v.number()
  })
    .index("byPeriod", ["selectionPeriodId", "executedAt"])
    .index("latest", ["selectionPeriodId"]),

  probabilityDistributions: defineTable({
    selectionPeriodId: v.id("selectionPeriods"),
    calculatedAt: v.number(),
    studentProbabilities: v.array(v.object({
      studentId: v.string(),
      topicProbabilities: v.array(v.number()) // Indexed by topic position
    })),
    simulationRuns: v.number(),
    perturbationLevel: v.number()
  })
    .index("byPeriod", ["selectionPeriodId", "calculatedAt"])
})
```

## API Implementation

### Mutations

```typescript
// mutations/runAllocation.ts
export const runAllocation = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    const isAdmin = await checkAdminPermissions(ctx)
    if (!isAdmin) {
      throw new Error("Unauthorized")
    }

    // Run allocation immediately
    await AllocationScheduler.execute(ctx, args.selectionPeriodId)

    return { success: true }
  }
})

// mutations/scheduleAllocation.ts
export const scheduleAllocation = internalMutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    await AllocationScheduler.scheduleIfNeeded(
      ctx,
      args.selectionPeriodId,
      60000 // 1 minute delay
    )
  }
})
```

### Queries

```typescript
// queries/getStudentProbabilities.ts
export const getStudentProbabilities = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Get latest probability distribution
    const latest = await ctx.db
      .query("probabilityDistributions")
      .withIndex("byPeriod", q =>
        q.eq("selectionPeriodId", args.selectionPeriodId)
      )
      .order("desc")
      .first()

    if (!latest) {
      return null
    }

    // Find student's probabilities
    const studentProbs = latest.studentProbabilities.find(
      sp => sp.studentId === args.studentId
    )

    if (!studentProbs) {
      return null
    }

    // Get topic details and format response
    const topics = await ctx.db.query("topics").collect()

    return {
      calculatedAt: latest.calculatedAt,
      probabilities: topics.map((topic, index) => ({
        topicId: topic._id,
        topicTitle: topic.title,
        probability: studentProbs.topicProbabilities[index] || 0,
        percentage: Math.round((studentProbs.topicProbabilities[index] || 0) * 100)
      }))
    }
  }
})
```

## Performance Optimizations

### Key Strategies

1. **Pre-allocation**: All arrays pre-allocated to avoid GC pressure
2. **Typed Arrays**: Use Float32Array, Uint16Array for better memory layout
3. **Buffer Reuse**: Reuse buffers across iterations in Monte Carlo
4. **Cache Locality**: Algorithm organized for sequential memory access
5. **Minimal Allocations**: In-place operations wherever possible

### Expected Performance

- **300 students, 30 topics**: ~50ms allocation time
- **100 Monte Carlo iterations**: ~500ms total
- **Memory usage**: ~5MB peak for 300 students
- **Cache hit rate**: >80% for probability queries

## Error Handling

```typescript
export class AllocationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = "AllocationError"
  }
}

// Retry logic for transient failures
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on permanent errors
      if (error.code === "INVALID_INPUT" || error.code === "UNAUTHORIZED") {
        throw error
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100))
    }
  }

  throw lastError
}
```

## Testing Strategy

### Unit Tests
```typescript
// allocation/algorithm.test.ts
describe("HungarianAllocator", () => {
  test("assigns all students with minimal regret", () => {
    const allocator = new HungarianAllocator(3, 3)
    const preferences = [
      { studentId: "s1", rankings: [1, 2, 3] },
      { studentId: "s2", rankings: [2, 1, 3] },
      { studentId: "s3", rankings: [3, 2, 1] }
    ]

    allocator.buildCostMatrix(preferences)
    const assignments = allocator.solve()

    expect(assignments.length).toBe(3)
    expect(getTotalRegret(assignments)).toBe(0) // Perfect matching possible
  })
})
```

### Performance Tests
```typescript
// allocation/performance.test.ts
describe("Performance", () => {
  test("handles 300 students in under 100ms", () => {
    const preferences = generateRandomPreferences(300, 30)
    const allocator = new HungarianAllocator(300, 30)

    const start = performance.now()
    allocator.buildCostMatrix(preferences)
    allocator.solve()
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)
  })
})
```

## Monitoring & Observability

```typescript
// Track key metrics
export const metrics = {
  allocationDuration: new Histogram({
    name: "allocation_duration_ms",
    help: "Time taken to run allocation",
    buckets: [10, 25, 50, 100, 250, 500, 1000]
  }),

  probabilityCalculationDuration: new Histogram({
    name: "probability_calculation_ms",
    help: "Time taken to calculate probabilities"
  }),

  averageRegret: new Gauge({
    name: "average_regret",
    help: "Average regret score per allocation"
  }),

  cacheHitRate: new Counter({
    name: "probability_cache_hits",
    help: "Number of cache hits for probability queries"
  })
}
```

## Deployment Considerations

1. **Feature Flag**: Deploy behind feature flag for gradual rollout
2. **Shadow Mode**: Run in parallel with existing system initially
3. **Monitoring**: Set up alerts for high regret scores or failures
4. **Backup**: Keep previous allocation method as fallback
5. **Performance**: Monitor p95 latencies and adjust iterations if needed