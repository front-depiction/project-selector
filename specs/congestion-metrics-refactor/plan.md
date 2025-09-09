# Congestion Metrics Refactoring - Implementation Plan

## Overview
This plan outlines the implementation of the congestion metrics refactoring using Convex Aggregate component, transforming from simple count-based metrics to meaningful average ranking position metrics with comprehensive event sourcing.

## Implementation Phases

### Phase 1: Install and Configure Convex Aggregate Component ✅
**Timeline**: Already completed
**Status**: DONE - Package already installed (@convex-dev/aggregate@0.1.23)

### Phase 2: Create Event System Foundation
**Timeline**: 2-3 hours
**Status**: PENDING

**Tasks**:
1. [ ] Create `/convex/schemas/Event.ts` with discriminated union types
   - Define all event types (StudentRegistered, TopicRankingUpdated, etc.)
   - Include proper TypeScript discriminators
   - Add validation functions

2. [ ] Create `/convex/tables/events.ts` table definition
   - Define schema with eventType, eventData, actorId, actorType
   - Add indexes for querying

3. [ ] Create `/convex/mutations/recordEvent.ts`
   - Generic event recording mutation
   - Type-safe event validation
   - Automatic timestamp handling

4. [ ] Create `/convex/queries/getEvents.ts`
   - Query events by type, actor, time range
   - Support pagination
   - Include filtering capabilities

### Phase 3: Implement Aggregate Components
**Timeline**: 3-4 hours
**Status**: PENDING

**Tasks**:
1. [ ] Create `/convex/aggregates/rankingsByTopic.ts`
   ```typescript
   // Namespace: topicId
   // Tracks: sum of positions, count, distribution
   ```

2. [ ] Create `/convex/aggregates/rankingsByStudent.ts`
   ```typescript
   // Namespace: studentId
   // Tracks: topics ranked, last update time
   ```

3. [ ] Create `/convex/aggregates/topicEvents.ts`
   ```typescript
   // Namespace: topicId
   // Tracks: event counts by type
   ```

4. [ ] Create `/convex/aggregates/index.ts`
   - Export all aggregate instances
   - Initialize with proper configuration

### Phase 4: Update Ranking Mutations
**Timeline**: 2-3 hours
**Status**: PENDING

**Tasks**:
1. [ ] Refactor `/convex/mutations/savePreferences.ts`
   - Record TopicRankingUpdated events
   - Update all three aggregates in parallel using Promise.all
   - Maintain atomicity with transactions

2. [ ] Create `/convex/mutations/batchUpdateRankings.ts`
   - Handle multiple ranking updates efficiently
   - Batch aggregate updates
   - Single event for batch changes

3. [ ] Update validation logic
   - Ensure all topics are ranked
   - Validate position uniqueness
   - Check for gaps in rankings

### Phase 5: Create Metric Queries
**Timeline**: 2 hours
**Status**: PENDING

**Tasks**:
1. [ ] Create `/convex/queries/getTopicMetrics.ts`
   - Fetch aggregated data from rankingsByTopic
   - Calculate average position (sum/count)
   - Determine competition category
   - Return distribution data

2. [ ] Create `/convex/queries/getRankingHistory.ts`
   - Query events for specific topic/student
   - Build time-series data
   - Support date range filtering

3. [ ] Create `/convex/queries/getCompetitionScore.ts`
   - Real-time competition score calculation
   - Include percentile rankings
   - Cache results for performance

### Phase 6: Update Frontend Components
**Timeline**: 3-4 hours
**Status**: PENDING

**Tasks**:
1. [ ] Update `/app/student/select/CongestionStats.tsx`
   - Display average position instead of count
   - Show competition category with color coding
   - Add distribution visualization
   - Implement real-time updates

2. [ ] Create `/components/CompetitionIndicator.tsx`
   - Visual indicator component
   - Color-coded based on competition level
   - Tooltip with detailed metrics

3. [ ] Update `/app/student/select/page.tsx`
   - Use new metric queries
   - Subscribe to real-time updates
   - Handle loading and error states

4. [ ] Add metric explanations
   - Help text explaining average position
   - Tooltip descriptions
   - Competition level legend

### Phase 7: Admin Analytics Dashboard
**Timeline**: 3-4 hours
**Status**: PENDING

**Tasks**:
1. [ ] Create `/app/admin/analytics/page.tsx`
   - Event log viewer with filters
   - Time-series charts for ranking evolution
   - Export functionality (JSON/CSV)

2. [ ] Create `/components/admin/MetricsChart.tsx`
   - Recharts-based visualizations
   - Real-time chart updates
   - Multiple chart types (line, bar, distribution)

3. [ ] Create `/components/admin/EventLogTable.tsx`
   - Paginated event display
   - Filtering by type, actor, time
   - Event detail modal

4. [ ] Add export utilities
   - JSON export for events
   - CSV export for metrics
   - Date range selection

### Phase 8: Data Migration
**Timeline**: 2 hours
**Status**: PENDING

**Tasks**:
1. [ ] Create `/convex/migrations/backfillEvents.ts`
   - Generate historical events from existing rankings
   - Preserve timestamps where available
   - Mark as migration events

2. [ ] Create `/convex/migrations/initializeAggregates.ts`
   - Compute initial aggregate values
   - Process all existing rankings
   - Verify data consistency

3. [ ] Add migration runner
   - Safe execution with rollback capability
   - Progress tracking
   - Verification step

### Phase 9: Testing and Optimization
**Timeline**: 2-3 hours
**Status**: PENDING

**Tasks**:
1. [ ] Performance testing
   - Load test with 1000+ students
   - Measure aggregate update times
   - Identify bottlenecks

2. [ ] Optimize database queries
   - Add necessary indexes
   - Optimize aggregate computations
   - Implement caching where appropriate

3. [ ] End-to-end testing
   - Student ranking flow
   - Real-time updates
   - Admin analytics

4. [ ] Fix any issues found
   - Performance improvements
   - Bug fixes
   - UX enhancements

### Phase 10: Documentation and Cleanup
**Timeline**: 1 hour
**Status**: PENDING

**Tasks**:
1. [ ] Update README with new metrics explanation
2. [ ] Document aggregate configuration
3. [ ] Add JSDoc comments to new functions
4. [ ] Remove old count-based code
5. [ ] Clean up unused imports and files

## Critical Path

1. **Event System** (Phase 2) - Foundation for everything
2. **Aggregates** (Phase 3) - Core computation engine
3. **Mutations** (Phase 4) - Data flow implementation
4. **Queries** (Phase 5) - Data retrieval
5. **Frontend** (Phase 6) - User-facing changes

Phases 7-10 can be done in parallel or reordered as needed.

## Risk Mitigation

### Risk 1: Aggregate Contention
**Mitigation**: Using namespace partitioning by topicId/studentId to prevent write contention

### Risk 2: Migration Data Loss
**Mitigation**: Keep old system running in parallel, verify data before cutover

### Risk 3: Performance Degradation
**Mitigation**: Extensive load testing, caching strategy, Promise.all for parallelization

### Risk 4: Real-time Update Delays
**Mitigation**: Batch updates, use Convex subscriptions efficiently, implement optimistic UI updates

## Success Metrics

- [ ] Average position metric live and accurate
- [ ] < 100ms update latency (p95)
- [ ] All events properly logged
- [ ] Zero data loss during migration
- [ ] Admin can view comprehensive analytics
- [ ] Students understand new metric (survey/feedback)

## Dependencies

- Convex Aggregate component (@convex-dev/aggregate) ✅
- Existing Convex setup ✅
- React/Next.js frontend ✅
- Recharts for visualizations ✅

## Notes

- All Promise operations should use Promise.all for parallelization
- Maintain backward compatibility during migration
- Feature flag for gradual rollout if needed
- Monitor performance metrics closely after deployment

## Progress Tracking

### Week 1
- [ ] Phase 2: Event System
- [ ] Phase 3: Aggregates
- [ ] Phase 4: Mutations
- [ ] Phase 5: Queries

### Week 2
- [ ] Phase 6: Frontend Updates
- [ ] Phase 7: Analytics Dashboard
- [ ] Phase 8: Migration
- [ ] Phase 9: Testing
- [ ] Phase 10: Documentation

## Next Steps

1. Start with Phase 2 - Create Event System Foundation
2. Implement core event types and recording mechanism
3. Test event recording with sample data
4. Move to Phase 3 - Aggregate implementation

---

*Last Updated*: [Will be updated as progress is made]
*Status*: READY TO IMPLEMENT