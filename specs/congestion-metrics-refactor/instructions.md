# Congestion Metrics Refactoring - Instructions

## Overview
Refactor the congestion metrics system to use average ranking position instead of simple count, implementing proper aggregations using Convex Aggregate component and adding an immutable event log for analytics.

## Core Requirements

### 1. Congestion Metric Redesign
- **Current Problem**: Using simple count of students who selected a topic is meaningless when everyone must rank all topics
- **New Approach**: Calculate competitive pressure based on average ranking position across all students
- **Formula**: Lower average position = higher competition (e.g., avg 2.3 means most students rank it in top 3)

### 2. Use Convex Aggregate Component
- **Documentation**: https://www.convex.dev/components/aggregate (mandatory reading)
- **Purpose**: Efficiently compute aggregations for real-time metrics
- **Aggregations Needed**:
  - Sum of all ranking positions per topic
  - Count of students who have ranked each topic
  - Average ranking position (sum/count)
  - Distribution of rankings (how many 1st, 2nd, 3rd choices, etc.)

### 3. Event Sourcing System
- **Requirement**: Create an immutable event log for all meaningful actions
- **Event Types** (ADT - Algebraic Data Type):
  - StudentRegistered
  - TopicRankingUpdated (with old and new positions)
  - SelectionPeriodOpened
  - SelectionPeriodClosed
  - TopicAdded
  - TopicRemoved
  - StudentLoggedIn
  - StudentViewedTopic
  - AdminAccessedDashboard
  - AlgorithmExecuted
  - AssignmentsPublished
- **All events must include**:
  - Timestamp (already provided by convex by default under _creationTime)
  - Actor ID (student or admin)
  - Event-specific payload

### 4. Competitive Score Display
- **Dual Format**:
  - Numeric score (e.g., 2.3 average position)
  - Category (Very High, High, Medium, Low competition)
- **Real-time Updates**: As students change rankings, scores update live
- **Visual Indicators**: Color coding and icons based on competition level

### 5. System Constraints
- **Even Distribution**: Students are evenly distributed across topics (Hungarian algorithm)
- **No Capacity Limits**: Topics have no maximum capacity
- **Mandatory Full Ranking**: All students must rank all topics
- **No Special Cases**: Topics with no selections are treated normally

## User Stories

### As a Student
1. I want to see how competitive each topic is based on where other students are ranking it
2. I want to understand my chances through clear visual indicators
3. I want to see real-time updates as the selection landscape changes

### As an Administrator  
1. I want to view detailed analytics from the event log
2. I want to see ranking distributions for each topic
3. I want to track how preferences evolve over time
4. I want to export event data for analysis

## Acceptance Criteria

1. **Metric Accuracy**
   - Average position correctly calculated using Convex Aggregate
   - Real-time updates within 1 second of changes
   - Handles concurrent updates correctly

2. **Event System**
   - All user actions create appropriate events
   - Events are immutable and timestamped
   - Events can be queried for analytics

3. **UI Updates**
   - Competition score shown as both number and category
   - Visual indicators (colors, icons) match competition level
   - Smooth transitions when values change

4. **Performance**
   - Aggregations computed efficiently
   - No blocking operations in UI
   - Scales to 1000+ students

## Technical Notes

- Use Convex Aggregate component for all aggregations
- Implement Event type as discriminated union (ADT)
- Events should use Convex's built-in timestamp
- Consider using Convex's subscription model for real-time updates

## Analytics Features to Enable

1. **Time-series Analysis**: How rankings change over time
2. **Preference Clustering**: Which topics are ranked together
3. **Strategic Patterns**: How students adjust based on competition
4. **Engagement Metrics**: Login frequency, time spent, number of adjustments

## Success Metrics

- Reduced confusion about what congestion means
- More strategic student behavior
- Better distribution of preferences
- Rich analytics for research purposes