# Assignment System Implementation Plan

## Phase 1: Schema Updates
**Estimated: 30 minutes**

### Tasks:
- [ ] Update SelectionPeriod schema with status ADT and scheduledFunctionId
- [ ] Create new Assignment schema module
- [ ] Update main schema.ts with assignments table and indexes
- [ ] Run format and typecheck after each change

### Files to modify:
- `convex/schemas/SelectionPeriod.ts`
- `convex/schemas/Assignment.ts` (new)
- `convex/schema.ts`

## Phase 2: Core Assignment Logic
**Estimated: 45 minutes**

### Tasks:
- [ ] Create assignments.ts with distribution algorithm
- [ ] Implement assignPeriod internal mutation
- [ ] Implement assignNow public mutation
- [ ] Add helper function for even distribution
- [ ] Run format and typecheck

### Files to create:
- `convex/assignments.ts`

## Phase 3: Admin Functions with Scheduling
**Estimated: 30 minutes**

### Tasks:
- [ ] Update createSelectionPeriod to include scheduling
- [ ] Update updateSelectionPeriod with reschedule logic
- [ ] Add assignNow mutation to admin.ts
- [ ] Test scheduling creation and cancellation
- [ ] Run format and typecheck

### Files to modify:
- `convex/admin.ts`

## Phase 4: Query Functions
**Estimated: 20 minutes**

### Tasks:
- [ ] Add getAssignments query
- [ ] Add getMyAssignment query
- [ ] Add helper to check period assignment status
- [ ] Run format and typecheck

### Files to modify:
- `convex/queries.ts` (or create if doesn't exist)

## Phase 5: Frontend Components
**Estimated: 45 minutes**

### Tasks:
- [ ] Create AssignNowButton component
- [ ] Integrate button into admin page
- [ ] Create AssignmentDisplay component
- [ ] Add assignment detection to main page
- [ ] Implement Framer Motion animations
- [ ] Run format and typecheck

### Files to create/modify:
- `components/admin/AssignNowButton.tsx` (new)
- `app/admin/page.tsx` (modify)
- `components/AssignmentDisplay.tsx` (new)
- `app/page.tsx` (modify)

## Phase 6: Testing & Validation
**Estimated: 20 minutes**

### Tasks:
- [ ] Test period creation with scheduling
- [ ] Test "Assign Now" functionality
- [ ] Verify even distribution
- [ ] Test animation transitions
- [ ] Verify schedule cancellation on update
- [ ] Run full lint and typecheck

## Implementation Order:

1. **Backend First** (Phases 1-4)
   - Complete all Convex changes
   - Ensure data layer is solid
   - Test with Convex dashboard

2. **Frontend Integration** (Phase 5)
   - Add UI components
   - Connect to backend mutations/queries
   - Implement animations

3. **End-to-End Testing** (Phase 6)
   - Full workflow validation
   - Edge case handling

## Key Considerations:

### During Implementation:
- Run `bun run format` and `bun run typecheck` after EVERY file change
- Keep all data structures immutable
- Use functional composition patterns
- Ensure all types are readonly

### Potential Blockers:
- Convex scheduler API changes
- Index conflicts with existing data
- Animation performance on large datasets

### Success Criteria:
- [ ] Admin can trigger assignments early
- [ ] Scheduled assignments work automatically
- [ ] Students see animated assignment reveal
- [ ] Even distribution achieved
- [ ] No type or lint errors

## Total Estimated Time: ~3 hours

## Next Steps After Implementation:
1. Document API changes
2. Add unit tests for distribution algorithm
3. Consider adding assignment preferences weighting
4. Plan for assignment appeals/changes feature