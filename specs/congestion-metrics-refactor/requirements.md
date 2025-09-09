# Congestion Metrics Refactoring - Requirements

## 1. Functional Requirements

### 1.1 Metric Calculation
- **FR-1.1**: System SHALL calculate competitive pressure as average ranking position
- **FR-1.2**: System SHALL update metrics within 1 second of ranking changes
- **FR-1.3**: System SHALL provide both numeric score (e.g., 2.3) and category (Very High/High/Medium/Low)
- **FR-1.4**: System SHALL handle concurrent updates using optimistic locking
- **FR-1.5**: System SHALL compute percentile rankings for relative comparison

### 1.2 Aggregation System
- **FR-2.1**: System SHALL use Convex Aggregate component for all metric computations
- **FR-2.2**: System SHALL maintain running aggregates for:
  - Total ranking sum per topic
  - Student count per topic  
  - Ranking distribution (count at each position)
  - Variance/standard deviation of rankings
- **FR-2.3**: System SHALL support incremental updates (not full recalculation)
- **FR-2.4**: System SHALL batch aggregate updates using Promise.all for performance

### 1.3 Event Sourcing
- **FR-3.1**: System SHALL create immutable event records for all state changes
- **FR-3.2**: System SHALL support the following event types:
  ```typescript
  type Event = 
    | StudentRegistered
    | TopicRankingUpdated
    | SelectionPeriodOpened
    | SelectionPeriodClosed
    | TopicCreated
    | TopicDeleted
    | TopicModified
    | StudentSessionStarted
    | StudentSessionEnded
    | AdminActionPerformed
    | AlgorithmExecuted
    | AssignmentsPublished
  ```
- **FR-3.3**: System SHALL timestamp all events using server time
- **FR-3.4**: System SHALL never delete or modify events (append-only)
- **FR-3.5**: System SHALL support event replay for debugging

### 1.4 Real-time Updates
- **FR-4.1**: System SHALL push metric updates via Convex subscriptions
- **FR-4.2**: System SHALL batch UI updates to prevent flicker
- **FR-4.3**: System SHALL show loading states during recalculation
- **FR-4.4**: System SHALL gracefully degrade if real-time fails

### 1.5 Analytics Queries
- **FR-5.1**: System SHALL provide time-series data for ranking evolution
- **FR-5.2**: System SHALL compute preference correlations between topics
- **FR-5.3**: System SHALL track adjustment patterns (how students change rankings)
- **FR-5.4**: System SHALL export event data in JSON/CSV formats

## 2. Non-Functional Requirements

### 2.1 Performance
- **NFR-1.1**: Metric updates SHALL complete within 100ms for 95% of operations
- **NFR-1.2**: System SHALL handle 1000+ concurrent students
- **NFR-1.3**: Aggregations SHALL use Promise.all for parallel processing
- **NFR-1.4**: Database queries SHALL use indexes on:
  - studentId + topicId (for ranking lookups)
  - topicId (for aggregations)
  - timestamp (for event queries)
- **NFR-1.5**: UI SHALL debounce ranking changes (500ms) before saving

### 2.2 Reliability
- **NFR-2.1**: System SHALL maintain consistency despite network failures
- **NFR-2.2**: System SHALL use idempotent operations for all mutations
- **NFR-2.3**: System SHALL validate all events against schema
- **NFR-2.4**: System SHALL handle partial failures gracefully

### 2.3 Scalability
- **NFR-3.1**: Aggregation computation SHALL be O(1) for updates
- **NFR-3.2**: Event storage SHALL partition by time period
- **NFR-3.3**: System SHALL support horizontal scaling via Convex

### 2.4 Observability
- **NFR-4.1**: System SHALL log all errors with context
- **NFR-4.2**: System SHALL track performance metrics
- **NFR-4.3**: System SHALL provide admin dashboard for monitoring

## 3. Data Models

### 3.1 Core Entities

```typescript
// Ranking with aggregation metadata
type Ranking = {
  studentId: Id<"students">
  topicId: Id<"topics">
  position: number // 1-based
  previousPosition?: number // for tracking changes
  updatedAt: number
  sessionId: string // for tracking user sessions
}

// Aggregated metrics per topic
type TopicMetrics = {
  topicId: Id<"topics">
  sumOfPositions: number
  studentCount: number
  averagePosition: number // computed: sum/count
  standardDeviation: number
  distributionByPosition: Record<number, number> // position -> count
  competitionCategory: "very-high" | "high" | "medium" | "low"
  percentile: number // 0-100
  lastUpdated: number
}

// Event log entry
type EventLog = {
  eventType: string // discriminator
  eventData: unknown // type-safe based on eventType
  actorId: string
  actorType: "student" | "admin" | "system"
  timestamp: number
  sessionId?: string
  metadata?: Record<string, unknown>
}
```

### 3.2 Event Type Definitions

```typescript
// Event ADT using discriminated unions
type SystemEvent =
  | {
      type: "STUDENT_REGISTERED"
      data: {
        studentId: string
        email: string
        registeredAt: number
      }
    }
  | {
      type: "RANKING_UPDATED"
      data: {
        studentId: string
        topicId: string
        oldPosition: number | null
        newPosition: number
        trigger: "manual" | "auto-save" | "reset"
      }
    }
  | {
      type: "BATCH_RANKINGS_UPDATED"
      data: {
        studentId: string
        updates: Array<{
          topicId: string
          oldPosition: number
          newPosition: number
        }>
      }
    }
  | {
      type: "SELECTION_PERIOD_OPENED"
      data: {
        periodId: string
        openDate: number
        closeDate: number
      }
    }
  // ... other event types
```

## 4. API Contracts

### 4.1 Mutations

```typescript
// Update rankings with batching
updateRankings: {
  args: {
    studentId: v.id("students"),
    updates: v.array(v.object({
      topicId: v.id("topics"),
      position: v.number()
    }))
  },
  handler: async (ctx, args) => {
    // 1. Validate all updates
    // 2. Create events in parallel
    // 3. Update rankings in parallel  
    // 4. Trigger aggregation updates
    // All using Promise.all for performance
  }
}

// Record event
recordEvent: {
  args: {
    eventType: v.string(),
    eventData: v.any(),
    actorId: v.string(),
    actorType: v.union(v.literal("student"), v.literal("admin"), v.literal("system"))
  },
  handler: async (ctx, args) => {
    // Validate and store event
  }
}
```

### 4.2 Queries

```typescript
// Get topic metrics with caching
getTopicMetrics: {
  args: {
    topicIds?: v.array(v.id("topics"))
  },
  returns: v.array(TopicMetrics),
  handler: async (ctx, args) => {
    // Fetch from aggregate tables
    // Use Promise.all for parallel fetching
  }
}

// Get ranking history
getRankingHistory: {
  args: {
    studentId: v.id("students"),
    topicId: v.id("topics"),
    limit?: v.number()
  },
  returns: v.array(Event),
  handler: async (ctx, args) => {
    // Query event log with filters
  }
}
```

### 4.3 Subscriptions

```typescript
// Real-time metrics updates
subscribeToMetrics: {
  args: {
    topicIds: v.array(v.id("topics"))
  },
  handler: async function* (ctx, args) {
    // Yield updates as metrics change
  }
}
```

## 5. Performance Optimizations

### 5.1 Batching Strategy
- Collect ranking changes for 500ms before persisting
- Update all rankings in single transaction
- Use Promise.all for parallel database operations
- Batch aggregate recalculations

### 5.2 Caching Strategy
- Cache computed metrics for 1 second
- Invalidate cache on ranking updates
- Use stale-while-revalidate pattern
- Pre-compute common aggregations

### 5.3 Query Optimization
- Denormalize frequently accessed data
- Use covering indexes
- Limit result sets with pagination
- Aggregate at write time, not read time

## 6. Dependencies

### 6.1 External Components
- **Convex Aggregate**: For efficient aggregation computation
- **Convex Database**: For data persistence
- **Convex Subscriptions**: For real-time updates

### 6.2 Internal Modules
- Event system module
- Metrics calculation module
- Ranking management module
- Analytics module

## 7. Migration Strategy

### 7.1 Data Migration
1. Create new aggregate tables
2. Backfill events from existing data
3. Compute initial aggregations
4. Switch to new metric display
5. Remove old count-based system

### 7.2 Rollback Plan
- Feature flag for old/new metrics
- Parallel computation during transition
- One-click rollback via flag

## 8. Testing Requirements

### 8.1 Unit Tests
- Metric calculation accuracy
- Event validation
- Category assignment logic

### 8.2 Integration Tests  
- Concurrent update handling
- Aggregation consistency
- Real-time subscription delivery

### 8.3 Performance Tests
- 1000 student simulation
- Concurrent update stress test
- Aggregation computation benchmarks

## 9. Security Considerations

- Students can only update own rankings
- Events are immutable (no updates/deletes)
- Admin actions logged separately
- Rate limiting on updates (max 10/minute)

## 10. Success Criteria

- Average position metric live for all topics
- < 100ms update latency (p95)
- Zero data loss in event log
- Analytics dashboard operational
- Positive user feedback on clarity