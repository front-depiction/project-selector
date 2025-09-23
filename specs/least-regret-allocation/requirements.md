# Least Regret Allocation - Technical Requirements

## Functional Requirements

### FR1: Automatic Allocation Scheduling
- **FR1.1**: System shall schedule allocation computation 1 minute after any preference change
- **FR1.2**: System shall use a scheduling table to prevent duplicate schedules
- **FR1.3**: System shall execute allocation automatically when scheduled time arrives
- **FR1.4**: System shall cancel pending schedules if selection period closes

### FR2: Allocation Algorithm
- **FR2.1**: System shall implement Hungarian algorithm using squared regret function
- **FR2.2**: System shall calculate regret as (rank - 1)² for each assignment
- **FR2.3**: System shall minimize total regret across all students
- **FR2.4**: System shall distribute students evenly across topics (balanced capacities)
- **FR2.5**: System shall guarantee every student receives exactly one assignment

### FR3: Probability Calculation
- **FR3.1**: System shall calculate assignment probabilities for each student-topic pair
- **FR3.2**: System shall use Monte Carlo simulation with 100+ iterations
- **FR3.3**: System shall apply small perturbations (±10% noise) to simulate uncertainty
- **FR3.4**: System shall update probabilities whenever preferences change
- **FR3.5**: System shall store probability history for trend analysis

### FR4: Data Persistence
- **FR4.1**: System shall store each allocation result with timestamp
- **FR4.2**: System shall store probability distributions for each computation
- **FR4.3**: System shall maintain history of all allocations for analysis
- **FR4.4**: System shall link allocations to specific selection periods

### FR5: Student Interface
- **FR5.1**: System shall display real-time probability percentages next to each topic
- **FR5.2**: System shall update probabilities within 2 minutes of any change
- **FR5.3**: System shall show visual indicators (colors/bars) for probability ranges
- **FR5.4**: System shall replace existing congestion indicators with probability display

### FR6: Admin Interface
- **FR6.1**: System shall show allocation statistics in admin dashboard
- **FR6.2**: System shall display rank distribution chart
- **FR6.3**: System shall show total and average regret metrics
- **FR6.4**: System shall provide manual trigger option for immediate allocation

## Non-Functional Requirements

### NFR1: Performance
- **NFR1.1**: Allocation shall complete within 500ms for up to 300 students
- **NFR1.2**: Probability calculation shall complete within 2 seconds
- **NFR1.3**: System shall handle concurrent preference updates without blocking
- **NFR1.4**: Scheduled functions shall not impact real-time operations

### NFR2: Scalability
- **NFR2.1**: Support up to 500 students per selection period
- **NFR2.2**: Support up to 50 topics per selection period
- **NFR2.3**: Store up to 10,000 historical allocation records
- **NFR2.4**: Handle 100 concurrent users updating preferences

### NFR3: Reliability
- **NFR3.1**: Allocation shall be atomic (all-or-nothing)
- **NFR3.2**: System shall retry failed allocations up to 3 times
- **NFR3.3**: System shall log all allocation attempts and failures
- **NFR3.4**: Probability calculations shall gracefully degrade under load

### NFR4: Maintainability
- **NFR4.1**: Follow functional programming patterns per CLAUDE.md
- **NFR4.2**: Maintain 100% immutability in allocation logic
- **NFR4.3**: Provide comprehensive unit tests for algorithm
- **NFR4.4**: Document all regret calculation strategies

## Data Models

### AllocationSchedule
```typescript
export const AllocationSchedule = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  scheduledAt: v.number(), // timestamp
  executeAt: v.number(),   // timestamp
  status: v.union(
    v.literal("pending"),
    v.literal("executing"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  version: v.number() // for optimistic concurrency
})
```

### AllocationResult
```typescript
export const AllocationResult = v.object({
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
```

### ProbabilityDistribution
```typescript
export const ProbabilityDistribution = v.object({
  selectionPeriodId: v.id("selectionPeriods"),
  calculatedAt: v.number(),
  distributions: v.array(v.object({
    studentId: v.string(),
    probabilities: v.array(v.object({
      topicId: v.id("topics"),
      probability: v.number() // 0-1
    }))
  })),
  simulationRuns: v.number(),
  perturbationLevel: v.number()
})
```

## API Contracts

### Mutations

```typescript
// Trigger immediate allocation (admin only)
export const runAllocation = mutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    strategy: v.optional(v.literal("squared"))
  },
  handler: async (ctx, args) => {
    // Validate admin permissions
    // Execute allocation algorithm
    // Store results
    // Update student assignments
    // Return allocation result
  }
})

// Schedule allocation after preference change
export const scheduleAllocation = internalMutation({
  args: {
    selectionPeriodId: v.id("selectionPeriods"),
    delayMs: v.number()
  },
  handler: async (ctx, args) => {
    // Check for existing schedule
    // Create or update schedule
    // Schedule execution
  }
})
```

### Queries

```typescript
// Get current probabilities for student
export const getStudentProbabilities = query({
  args: {
    studentId: v.string(),
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Fetch latest probability distribution
    // Filter for specific student
    // Return formatted probabilities
  }
})

// Get allocation statistics
export const getAllocationStats = query({
  args: {
    selectionPeriodId: v.id("selectionPeriods")
  },
  handler: async (ctx, args) => {
    // Fetch latest allocation result
    // Return statistics summary
  }
})
```

### Scheduled Functions

```typescript
// Execute scheduled allocation
export const executeScheduledAllocation = internalMutation({
  args: {
    scheduleId: v.id("allocationSchedules")
  },
  handler: async (ctx, args) => {
    // Verify schedule is still valid
    // Run allocation algorithm
    // Calculate probabilities
    // Store results
    // Clean up schedule
  }
})
```

## Algorithm Specifications

### Hungarian Algorithm Implementation
1. Create cost matrix with dimensions [students × topics]
2. Apply squared regret function: cost[i][j] = (rank[i][j] - 1)²
3. Balance capacities by distributing evenly
4. Expand matrix for multiple slots per topic
5. Apply Munkres algorithm to find optimal assignment
6. Post-process to extract final assignments

### Probability Calculation
1. Run base allocation to establish baseline
2. For N iterations (100-1000):
   - Add Gaussian noise to preference rankings (σ = 0.1 × rank)
   - Run allocation with perturbed preferences
   - Track assignment frequency for each student-topic pair
3. Calculate probability as frequency / total iterations
4. Smooth probabilities using moving average if needed

### Capacity Distribution
```typescript
const distributeCapacity = (numStudents: number, numTopics: number): number[] => {
  const base = Math.floor(numStudents / numTopics)
  const remainder = numStudents % numTopics
  const capacities = Array(numTopics).fill(base)

  // Distribute remainder evenly
  for (let i = 0; i < remainder; i++) {
    capacities[i]++
  }

  return capacities
}
```

## Integration Points

### With Existing System
1. **Selection Periods**: Read current period and preferences
2. **Topics**: Fetch available topics for allocation
3. **Preferences**: Read student rankings from existing system
4. **Students**: Update assignment status after allocation
5. **UI Components**: Replace congestion indicators with probabilities

### Database Indexes
```typescript
// For efficient queries
export const indexes = {
  allocationSchedules: {
    byPeriodAndStatus: ["selectionPeriodId", "status"],
    byExecuteTime: ["executeAt", "status"]
  },
  allocationResults: {
    byPeriod: ["selectionPeriodId", "executedAt"],
    latest: ["selectionPeriodId", "-executedAt"]
  },
  probabilityDistributions: {
    byPeriod: ["selectionPeriodId", "-calculatedAt"]
  }
}
```

## Testing Requirements

### Unit Tests
- Algorithm correctness with known inputs/outputs
- Regret calculation strategies
- Capacity distribution logic
- Probability calculation accuracy

### Integration Tests
- End-to-end allocation flow
- Schedule creation and execution
- Database persistence
- Concurrent update handling

### Performance Tests
- 300 students allocation under 500ms
- 1000 iteration probability calculation
- Concurrent preference updates
- Memory usage under load

## Migration Strategy

1. **Phase 1**: Deploy algorithm without UI changes
2. **Phase 2**: Add probability displays alongside existing indicators
3. **Phase 3**: Run in shadow mode (calculate but don't assign)
4. **Phase 4**: Enable for new selection periods
5. **Phase 5**: Migrate historical data if needed
6. **Phase 6**: Remove old congestion system

## Success Criteria

- ✅ All students assigned to exactly one topic
- ✅ Average regret < 2.0 with squared strategy
- ✅ 80% of students receive top 3 choices
- ✅ Allocation completes in < 500ms
- ✅ Probabilities update within 2 minutes
- ✅ No allocation failures in production
- ✅ Admin can monitor and control process