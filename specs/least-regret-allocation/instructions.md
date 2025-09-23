# Least Regret Allocation - Feature Instructions

## Overview
Implement a least regret algorithm for optimally allocating students to their preferred project topics, minimizing overall "regret" (dissatisfaction with assignments).

## User Stories

### As an Admin
- I want to run an automated allocation algorithm that assigns all students to topics based on their preferences
- I want the system to minimize overall regret (students getting lower-ranked choices)
- I want to see allocation statistics including total regret, average regret, and rank distribution
- I want to configure different regret strategies (linear, squared, exponential)
- I want to handle project capacity constraints

### As a Student
- I want fair consideration of my preferences during allocation
- I want the system to avoid giving me very low-ranked choices when possible
- I want transparency about how likely I am to get each of my choices

## Core Requirements

### Algorithm Requirements
1. **Input**: Student preference rankings for available topics
2. **Output**: Optimal student-topic assignments minimizing total regret
3. **Regret Calculation**: Support multiple strategies
   - Linear: rank - 1 (0 for 1st choice, 1 for 2nd, etc.)
   - Squared: (rank - 1)² (heavily penalizes lower choices)
   - Exponential: 2^(rank-1) - 1 (extreme penalty for bad matches)

### Capacity Constraints
- Each topic has a maximum capacity
- Total capacity must equal or exceed number of students
- Handle uneven distribution (some topics more popular)

### Performance Requirements
- Handle up to 300 students
- Handle up to 30 topics
- Complete allocation within 5 seconds

### Data Requirements
- Store allocation results with timestamp
- Track individual student regret scores
- Calculate and store statistics

## Acceptance Criteria

1. **Allocation Execution**
   - Admin can trigger allocation from dashboard
   - System validates all students have submitted preferences
   - Algorithm runs and produces assignments
   - Results are saved to database

2. **Result Quality**
   - No student is unassigned (if capacity allows)
   - Capacity constraints are respected
   - Total regret is minimized for chosen strategy
   - No manual intervention required for standard cases

3. **Visibility & Reporting**
   - Display allocation summary statistics
   - Show rank distribution (how many got 1st choice, 2nd, etc.)
   - Individual student can see their assignment
   - Export results to CSV/Excel

4. **Probability Analysis** (Nice to have)
   - Run Monte Carlo simulations to show assignment probabilities
   - Help students understand their chances
   - Identify "at-risk" students likely to get poor assignments

## Technical Constraints

1. Must integrate with existing Convex backend
2. Use TypeScript with functional programming style per CLAUDE.md
3. Maintain immutability - no mutation of data structures
4. Follow existing patterns for API mutations and queries
5. Ensure atomicity - allocation either fully succeeds or fails

## Context from Inspiration

The provided example shows:
- Use of Hungarian algorithm (munkres-js) for optimization
- Multiple regret strategies implementation
- Probability distribution calculations via Monte Carlo
- Handling of project capacities through matrix expansion

## Questions for Clarification

1. **Selection Period Integration**: Should allocation only run when period status is "closed"?
2. **Preference Validation**: What if a student hasn't ranked all topics?
3. **Tie Breaking**: How to handle students with identical preference patterns?
4. **Capacity Flexibility**: Can topic capacities be automatically adjusted if needed?
5. **Manual Overrides**: Should admins be able to manually adjust assignments post-allocation?
6. **Historical Data**: Should we store all allocation attempts or just the final one?
7. **Real-time Feedback**: Should students see probability estimates before submission deadline?
8. **Fairness Metrics**: Should we track fairness across different student groups?

## Success Metrics

- 80% of students get their top 3 choices
- Average regret score < 2.0 (for squared strategy)
- No student gets choice ranked worse than 5 (if possible)
- Allocation completes in < 2 seconds for 300 students
- Zero failed allocations due to algorithm errors

## Next Steps

1. Review and refine requirements
2. Design technical architecture
3. Plan implementation phases
4. Build and test algorithm
5. Integrate with existing system