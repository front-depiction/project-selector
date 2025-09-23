# Least Regret Allocation - Implementation Plan

## Overview
Implement a high-performance least regret allocation system for student-topic assignments with automatic scheduling and real-time probability calculations.

## Development Phases

### Phase 1: Core Algorithm Implementation ⏱️ 4 hours
Build the performance-optimized Hungarian algorithm

**Tasks:**
- [ ] Install munkres-js as fallback/reference implementation
- [ ] Create `convex/allocation/types.ts` with core type definitions
- [ ] Implement `convex/allocation/algorithm.ts` with HungarianAllocator class
- [ ] Add capacity distribution utilities in `convex/allocation/utils.ts`
- [ ] Write unit tests for algorithm correctness
- [ ] Performance benchmark against 300 students

**Deliverables:**
- Working Hungarian algorithm implementation
- Unit tests passing with >90% coverage
- Performance <100ms for 300 students

**Success Criteria:**
- ✅ All students assigned exactly once
- ✅ Total regret minimized
- ✅ Handles uneven student/topic counts

---

### Phase 2: Database Schema & Tables ⏱️ 2 hours
Set up Convex tables and indexes

**Tasks:**
- [ ] Add `allocationSchedules` table to schema
- [ ] Add `allocationResults` table to schema
- [ ] Add `probabilityDistributions` table to schema
- [ ] Create necessary indexes for performance
- [ ] Run migrations to create tables
- [ ] Add seed data for testing

**Deliverables:**
- Updated schema.ts file
- Database tables created
- Indexes configured

**Success Criteria:**
- ✅ Tables accessible via Convex dashboard
- ✅ Indexes improve query performance
- ✅ No schema validation errors

---

### Phase 3: Scheduling System ⏱️ 3 hours
Implement automatic scheduling with deduplication

**Tasks:**
- [ ] Create `convex/allocation/scheduler.ts` with AllocationScheduler class
- [ ] Implement schedule deduplication logic
- [ ] Add `scheduleAllocation` internal mutation
- [ ] Create `executeScheduledAllocation` scheduled function
- [ ] Wire up preference change triggers
- [ ] Test scheduling and rescheduling behavior

**Deliverables:**
- Working scheduling system
- Automatic triggers on preference changes
- Deduplication preventing multiple schedules

**Success Criteria:**
- ✅ Only one pending schedule per period
- ✅ Schedules execute after 1 minute
- ✅ New changes extend deadline
- ✅ No duplicate executions

---

### Phase 4: Probability Engine ⏱️ 4 hours
Build Monte Carlo simulation system

**Tasks:**
- [ ] Implement `convex/allocation/probability.ts` with ProbabilityCalculator
- [ ] Add perturbation logic with deterministic noise
- [ ] Implement buffer reuse for performance
- [ ] Create ProbabilityCache for query optimization
- [ ] Add background probability calculation
- [ ] Write tests for probability accuracy

**Deliverables:**
- Monte Carlo engine with 100+ iterations
- Cached probability results
- Background calculation system

**Success Criteria:**
- ✅ Probabilities sum to 1 for each student
- ✅ Calculation <2 seconds for 300 students
- ✅ Cache hit rate >80%
- ✅ Results stable across runs

---

### Phase 5: API Layer ⏱️ 3 hours
Create mutations and queries for the system

**Tasks:**
- [ ] Create `runAllocation` mutation for manual trigger
- [ ] Create `getStudentProbabilities` query
- [ ] Create `getAllocationStats` query
- [ ] Add `getHistoricalAllocations` query
- [ ] Implement permission checks
- [ ] Add error handling and validation

**Deliverables:**
- Complete API surface for allocation system
- Permission-protected admin endpoints
- Student-accessible probability queries

**Success Criteria:**
- ✅ Admin can trigger allocation manually
- ✅ Students see real-time probabilities
- ✅ Proper error messages for failures
- ✅ No unauthorized access

---

### Phase 6: UI Integration - Student Side ⏱️ 4 hours
Replace congestion indicators with probabilities

**Tasks:**
- [ ] Update preference selection component
- [ ] Add probability percentage display
- [ ] Implement color coding (green/yellow/red)
- [ ] Add probability trend indicators
- [ ] Create loading states during calculation
- [ ] Add tooltips explaining probabilities

**Deliverables:**
- Updated student preference UI
- Real-time probability display
- Visual indicators for likelihood

**Success Criteria:**
- ✅ Probabilities update within 2 minutes
- ✅ Clear visual hierarchy (high/medium/low)
- ✅ Smooth loading transitions
- ✅ Mobile-responsive display

---

### Phase 7: UI Integration - Admin Side ⏱️ 3 hours
Add allocation controls and statistics

**Tasks:**
- [ ] Add allocation trigger button to admin dashboard
- [ ] Create allocation statistics card
- [ ] Build rank distribution chart
- [ ] Add allocation history table
- [ ] Implement export to CSV functionality
- [ ] Add loading and error states

**Deliverables:**
- Admin allocation controls
- Statistics visualization
- Historical data access

**Success Criteria:**
- ✅ One-click allocation trigger
- ✅ Clear statistics display
- ✅ Exportable results
- ✅ Historical trend analysis

---

### Phase 8: Testing & Optimization ⏱️ 4 hours
Comprehensive testing and performance tuning

**Tasks:**
- [ ] End-to-end allocation flow testing
- [ ] Load testing with 500 students
- [ ] Optimize slow queries with indexes
- [ ] Add performance monitoring
- [ ] Test error recovery scenarios
- [ ] Browser performance profiling

**Deliverables:**
- Full test suite
- Performance benchmarks
- Monitoring dashboards

**Success Criteria:**
- ✅ All tests passing
- ✅ <500ms allocation for 300 students
- ✅ <2s probability calculation
- ✅ Zero failed allocations in testing

---

### Phase 9: Documentation & Deployment Prep ⏱️ 2 hours
Prepare for production deployment

**Tasks:**
- [ ] Write operation documentation
- [ ] Create troubleshooting guide
- [ ] Add code comments and JSDoc
- [ ] Set up feature flags
- [ ] Configure monitoring alerts
- [ ] Create rollback plan

**Deliverables:**
- Complete documentation
- Deployment checklist
- Monitoring setup

**Success Criteria:**
- ✅ Documentation covers all scenarios
- ✅ Feature flag enables gradual rollout
- ✅ Alerts configured for failures
- ✅ Clear rollback procedure

---

### Phase 10: Production Deployment ⏱️ 2 hours
Deploy to production environment

**Tasks:**
- [ ] Deploy with feature flag disabled
- [ ] Run shadow mode validation
- [ ] Enable for test selection period
- [ ] Monitor metrics and errors
- [ ] Gradual rollout to all periods
- [ ] Remove old congestion system

**Deliverables:**
- Production deployment
- Validated performance
- Full system cutover

**Success Criteria:**
- ✅ Zero production errors
- ✅ Performance meets targets
- ✅ Positive user feedback
- ✅ Successful allocation runs

---

## Timeline

```
Week 1: Phase 1-3 (Core Algorithm & Scheduling)
Week 2: Phase 4-5 (Probability Engine & API)
Week 3: Phase 6-7 (UI Integration)
Week 4: Phase 8-10 (Testing & Deployment)

Total: ~28 hours of development
```

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Performance issues with 300+ students | Medium | High | Pre-optimize with typed arrays, benchmark early |
| Scheduling conflicts | Low | Medium | Deduplication logic, comprehensive testing |
| Probability calculation too slow | Medium | Medium | Caching, reduce iterations if needed |
| UI updates cause lag | Low | High | Debounce updates, use React.memo |
| Production deployment issues | Low | High | Feature flags, shadow mode, gradual rollout |

## Dependencies

### External Libraries
```json
{
  "munkres-js": "^1.2.2",     // Reference implementation
  "convex": "^1.x.x",          // Backend platform
  "recharts": "^2.x.x"         // For statistics charts
}
```

### Internal Dependencies
- Existing preference system
- Current topic management
- Selection period lifecycle
- Student authentication

## Monitoring Metrics

### Performance KPIs
- Allocation duration (p50, p95, p99)
- Probability calculation time
- Cache hit rate
- Memory usage

### Business KPIs
- Average regret score
- % students getting top 3 choices
- Rank distribution
- Failed allocation rate

### User Experience KPIs
- Probability update latency
- UI responsiveness
- Error rate
- User satisfaction scores

## Progress Tracking

### Daily Standups
- Update task completion status
- Identify blockers
- Adjust timeline if needed

### Weekly Reviews
- Demo completed features
- Review performance metrics
- Plan next week's work

### Milestones
1. **Week 1**: Core algorithm working
2. **Week 2**: Complete backend system
3. **Week 3**: UI fully integrated
4. **Week 4**: Production ready

## Testing Checklist

### Unit Tests
- [ ] Algorithm correctness
- [ ] Capacity distribution
- [ ] Probability calculations
- [ ] Schedule deduplication
- [ ] API validation

### Integration Tests
- [ ] End-to-end allocation flow
- [ ] Scheduling triggers
- [ ] Database persistence
- [ ] UI updates

### Performance Tests
- [ ] 300 student allocation <500ms
- [ ] 500 student allocation <1s
- [ ] Probability calculation <2s
- [ ] Concurrent updates handling

### User Acceptance Tests
- [ ] Student can see probabilities
- [ ] Admin can trigger allocation
- [ ] Results are fair and explainable
- [ ] Export functionality works

## Go/No-Go Criteria

### Go Criteria
- All tests passing
- Performance targets met
- No critical bugs
- Documentation complete
- Rollback plan ready

### No-Go Criteria
- Performance >2x slower than target
- Critical bugs unresolved
- Missing core functionality
- No monitoring in place
- Team not confident

## Post-Launch Tasks

### Week 1 After Launch
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Fine-tune performance
- [ ] Address urgent issues

### Month 1 After Launch
- [ ] Analyze allocation fairness
- [ ] Optimize based on real data
- [ ] Remove old system code
- [ ] Document lessons learned

## Notes

### Key Decisions
- Using mutable arrays for performance over immutability
- 100 Monte Carlo iterations as default (tunable)
- 1-minute scheduling delay (tunable)
- Squared regret function as default

### Open Questions
- Should we add manual override capability?
- Do we need audit logging for compliance?
- Should probability calculation be configurable?

### Future Enhancements
- Machine learning for better predictions
- Multiple allocation strategies
- Preference learning from historical data
- Real-time collaboration features

---

## Approval Checkpoint

**Ready to proceed with implementation?**

All phases have been planned with:
- Clear deliverables
- Success criteria
- Time estimates
- Risk mitigation

Total estimated time: 28 hours
Target completion: 4 weeks

**Next Step**: Begin Phase 1 implementation