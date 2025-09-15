# Assignment System Requirements

## 1. Functional Requirements

### 1.1 Selection Period Status Management

#### FR-1.1.1: Status ADT
- Selection periods SHALL have a discriminated union status field
- Status types:
  - `open`: Selection period is active and accepting rankings
  - `assigned`: Selection period has been closed and assignments have been made
- When status transitions to `assigned`, the period MUST be linked to assignment records

#### FR-1.1.2: Scheduled Assignment
- Every selection period MUST have an associated scheduled function
- The scheduled function ID MUST be stored in the period schema as `scheduledFunctionId: v.id("_scheduled_functions")`
- The scheduled function SHALL automatically call `assignPeriod` at the period's `closeDate`
- Scheduled functions SHALL use Convex's `scheduler.runAt()` API

### 1.2 Admin Controls

#### FR-1.2.1: Assign Now Button
- Admin page SHALL display an "Assign Now" button during open selection periods
- Button SHALL be disabled when:
  - No selection period is active
  - Selection period status is already "assigned"
  - Assignment process is in progress

#### FR-1.2.2: Early Assignment Trigger
- Clicking "Assign Now" SHALL:
  1. Cancel the existing scheduled function
  2. Immediately execute the `assignPeriod` function
  3. Update the period status to "assigned"
  4. Create assignment records

### 1.3 Assignment Algorithm

#### FR-1.3.1: Distribution Requirements
- The `assignPeriod` function SHALL:
  - Retrieve all student preferences for the period
  - Distribute students evenly across topics (±1 student difference max)
  - Respect topic capacity constraints if defined
  - Create one assignment record per student

#### FR-1.3.2: Assignment Strategy
- Initial implementation SHALL use random even distribution
- Each student SHALL be assigned to exactly one topic
- Unranked students SHALL still be assigned to topics

### 1.4 Assignment Records

#### FR-1.4.1: Assignment Table Schema
- Assignment records SHALL contain:
  - `periodId`: Reference to the selection period
  - `studentId`: Student identifier
  - `topicId`: Assigned topic
  - `assignedAt`: Timestamp of assignment
  - `rank`: The student's original rank for this topic (if any)

### 1.5 User Interface Updates

#### FR-1.5.1: Assignment Display
- Front page SHALL detect when period transitions to "assigned" status
- Display SHALL show:
  - All topics with their assigned student lists
  - Total count of students per topic
  - Visual indication of even distribution

#### FR-1.5.2: Personalized View
- IF user has registered student ID:
  - Display prominent message: "You have been assigned to [Topic Name]"
  - Highlight their assigned topic distinctively
  - Show their original preference rank for the assigned topic

#### FR-1.5.3: Animation Requirements
- Assignment reveal SHALL use Framer Motion animations
- Animations SHALL include:
  - Smooth transition from selection to assignment view
  - Staggered reveal of topic assignments
  - Emphasis animation for user's personal assignment

## 2. Non-Functional Requirements

### 2.1 Performance
- Assignment algorithm SHALL complete within 5 seconds for up to 500 students
- Animation transitions SHALL maintain 60fps on modern browsers
- Page SHALL remain responsive during assignment calculation

### 2.2 Reliability
- Assignment process SHALL be atomic (all-or-nothing)
- Scheduled functions SHALL have retry logic for transient failures
- System SHALL handle concurrent "Assign Now" requests gracefully

### 2.3 Data Integrity
- Every student with preferences SHALL receive exactly one assignment
- No topic SHALL exceed its capacity limit
- Assignment records SHALL be immutable once created

### 2.4 Maintainability
- Code SHALL follow functional programming patterns
- All types SHALL be immutable with readonly properties
- Functions SHALL be pure where possible

## 3. System Constraints

### 3.1 Technical Stack
- Database: Convex
- Frontend: Next.js with TypeScript
- Animation: Framer Motion
- Scheduling: Convex Scheduled Functions

### 3.2 Development Constraints
- Follow existing codebase patterns for:
  - ADT constructors
  - Immutable data structures
  - Functional composition
  - Promise chains

### 3.3 Schema Modifications
- SelectionPeriod schema MUST be updated to include:
  - `status` field as discriminated union
  - `scheduledFunctionId` as reference to scheduled functions
  - `assignmentId` as optional reference when assigned

## 4. External Dependencies

### 4.1 Convex Scheduler
- Use `scheduler.runAt()` for future execution
- Use scheduler cancellation for early assignment
- Handle scheduler errors appropriately

### 4.2 Framer Motion
- Version compatibility with existing Next.js setup
- Use existing animation patterns from codebase

## 5. Migration Requirements

### 5.1 Existing Data
- Existing selection periods SHALL be migrated to include new fields
- Default status for existing periods SHALL be determined by dates
- Scheduled functions SHALL be created for active periods

## 6. Testing Requirements

### 6.1 Unit Tests
- Assignment algorithm distribution logic
- Status transition functions
- Schedule management functions

### 6.2 Integration Tests
- End-to-end assignment flow
- Schedule creation and cancellation
- Concurrent assignment attempts

## 7. Acceptance Criteria

### AC-1: Admin Can Trigger Early Assignment
- GIVEN an open selection period
- WHEN admin clicks "Assign Now"
- THEN assignments are created immediately
- AND scheduled function is cancelled
- AND period status changes to "assigned"

### AC-2: Automatic Assignment at Close Date
- GIVEN a selection period with scheduled function
- WHEN the close date is reached
- THEN assignments are created automatically
- AND period status changes to "assigned"

### AC-3: Even Distribution
- GIVEN N students and M topics
- WHEN assignments are made
- THEN each topic has N÷M or (N÷M)+1 students
- AND every student has exactly one assignment

### AC-4: Animated Assignment Reveal
- GIVEN assignments have been made
- WHEN user views the front page
- THEN assignments appear with smooth animations
- AND user's assignment is prominently displayed

### AC-5: Schedule Management
- GIVEN a selection period is modified
- WHEN the close date changes
- THEN the old scheduled function is cancelled
- AND a new scheduled function is created