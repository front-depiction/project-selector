# Project Topic Selection System - Requirements

## 1. System Overview

### 1.1 Purpose
A web-based system for university students to rank their preferences for project topics with real-time congestion awareness, minimizing disappointment in the allocation process.

### 1.2 Scope
- Student preference collection interface
- Real-time congestion monitoring (show when choice is unlikely to be picked)
- Administrative topic management
- Data persistence and synchronization

### 1.3 Users
- **Students**: Submit and modify project topic preferences
- **Administrators**: Configure topics and monitor selections

## 2. Functional Requirements

### 2.1 Student Interface (FR-STUDENT)

#### FR-STUDENT-001: Student Identification
- System SHALL accept student ID input without authentication
- System SHALL validate student ID format (alphanumeric)
- System SHALL associate all preferences with the provided student ID
- System SHALL retrieve existing preferences when student ID is re-entered

#### FR-STUDENT-002: Topic Display
- System SHALL display all active topics for current semester
- System SHALL show topic title and description for each topic
- System SHALL indicate selection period status (open/closed)
- System SHALL prevent modifications after closing date

#### FR-STUDENT-003: Preference Ranking
- System SHALL provide drag-and-drop interface for ranking topics
- System SHALL use existing `sortable-list.tsx` component
- System SHALL maintain ordered list of all available topics
- System SHALL allow reordering via drag-and-drop gestures
- System SHALL support keyboard navigation for accessibility

#### FR-STUDENT-004: Congestion Display
- System SHALL show count of students per topic in real-time
- System SHALL calculate congestion ratio for each topic
- System SHALL update congestion data without page refresh
- System SHALL provide visual congestion indicators (color/percentage)
- System SHALL NOT reveal individual student identities

#### FR-STUDENT-005: Preference Persistence
- System SHALL auto-save preference order on every change
- System SHALL provide save confirmation feedback
- System SHALL timestamp last modification
- System SHALL maintain preferences across sessions

### 2.2 Administrator Interface (FR-ADMIN)

#### FR-ADMIN-001: Topic Management
- System SHALL allow creation of new topics
- System SHALL allow editing of topic title and description
- System SHALL allow deletion of topics (before selection period)
- System SHALL support bulk topic import/export

#### FR-ADMIN-002: Period Management
- System SHALL configure selection opening date/time
- System SHALL configure selection closing date/time
- System SHALL enforce period boundaries automatically
- System SHALL display current period status

#### FR-ADMIN-003: Monitoring
- System SHALL display real-time selection statistics
- System SHALL show distribution graphs/charts
- System SHALL provide topic popularity rankings
- System SHALL export selection data in CSV format

### 2.3 Congestion Calculation (FR-CALC)

#### FR-CALC-001: Ratio Computation
- System SHALL calculate expected even distribution: `totalStudents / numberOfTopics`
- System SHALL calculate topic congestion: `studentsOnTopic / expectedEvenDistribution`
- System SHALL update calculations in real-time
- System SHALL handle edge cases (zero students, single topic)

#### FR-CALC-002: Likelihood Estimation
- System SHALL categorize congestion levels:
  - Low (ratio < 0.5): High chance
  - Moderate (0.5 ≤ ratio < 1.0): Good chance
  - High (1.0 ≤ ratio < 1.5): Lower chance
  - Very High (ratio ≥ 1.5): Low chance

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-PERF)

#### NFR-PERF-001: Response Time
- Drag-and-drop operations SHALL complete within 100ms
- Save operations SHALL complete within 500ms
- Congestion updates SHALL appear within 1 second

#### NFR-PERF-002: Concurrency
- System SHALL support 500 concurrent users
- System SHALL handle 100 simultaneous preference updates
- System SHALL maintain data consistency under concurrent access

#### NFR-PERF-003: Scalability
- System SHALL support up to 1000 students per semester
- System SHALL support up to 50 topics per semester
- System SHALL maintain performance with full capacity

### 3.2 Reliability (NFR-REL)

#### NFR-REL-001: Availability
- System SHALL be available 99% during selection period
- System SHALL provide graceful degradation under high load
- System SHALL recover from temporary network interruptions

#### NFR-REL-002: Data Integrity
- System SHALL ensure atomic preference updates
- System SHALL prevent data loss during saves
- System SHALL maintain consistency across all clients

### 3.3 Usability (NFR-USE)

#### NFR-USE-001: User Interface
- Interface SHALL be responsive (mobile and desktop)
- Interface SHALL provide clear visual feedback
- Interface SHALL follow WCAG 2.1 Level AA guidelines
- Interface SHALL work on modern browsers (Chrome, Firefox, Safari, Edge)

#### NFR-USE-002: User Experience
- Drag-and-drop SHALL feel smooth and responsive
- Congestion indicators SHALL be immediately understandable
- Error messages SHALL be clear and actionable
- System SHALL provide inline help/tooltips

### 3.4 Security (NFR-SEC)

#### NFR-SEC-001: Data Protection
- System SHALL validate all input data
- System SHALL sanitize data before storage
- System SHALL prevent SQL injection and XSS attacks
- System SHALL use HTTPS for all communications

#### NFR-SEC-002: Access Control
- System SHALL separate student and admin interfaces
- System SHALL require admin authentication (future)
- System SHALL log all administrative actions

## 4. Technical Requirements

### 4.1 Technology Stack (TR-TECH)

#### TR-TECH-001: Frontend
- React with TypeScript
- Next.js framework
- Framer Motion for animations
- Existing sortable-list component

#### TR-TECH-002: Backend
- Convex for real-time database and all persistence
- Simple TypeScript (no Effect library)
- No external database required

#### TR-TECH-003: Development
- TypeScript with basic type checking
- Standard ESLint configuration
- Simplified testing approach
- Direct Convex integration

### 4.2 Data Requirements (TR-DATA)

#### TR-DATA-001: Student Preferences
```typescript
type StudentPreference = {
  studentId: string
  preferences: Array<{
    topicId: string
    rank: number
  }>
  lastUpdated: Date
}
```

#### TR-DATA-002: Topics
```typescript
type Topic = {
  id: string
  title: string
  description: string
  semesterId: string
  isActive: boolean
  createdAt: Date
}
```

#### TR-DATA-003: Selection Period
```typescript
type SelectionPeriod = {
  semesterId: string
  openDate: Date
  closeDate: Date
  isActive: boolean
}
```

#### TR-DATA-004: Congestion Data
```typescript
type CongestionData = {
  topicId: string
  studentCount: number
  congestionRatio: number
  likelihoodCategory: "low" | "moderate" | "high" | "very-high"
}
```

## 5. Constraints

### 5.1 Business Constraints
- No authentication system in initial version
- No built-in allocation algorithm
- No maximum capacity limits per topic
- Semester-based operation model

### 5.2 Technical Constraints
- Must use existing sortable-list component
- Must use Convex for data persistence
- Must follow project's Effect patterns
- Must maintain real-time synchronization

## 6. Dependencies

### 6.1 External Dependencies
- Convex backend service availability
- Network connectivity for real-time updates
- Modern browser with JavaScript enabled

### 6.2 Internal Dependencies
- Existing UI components (sortable-list.tsx)
- Project configuration (CLAUDE.md guidelines)
- Convex SDK and React hooks

## 7. Acceptance Criteria

### 7.1 Student Flow
- ✓ Student can enter ID and access system
- ✓ Student can view all available topics
- ✓ Student can drag-drop to reorder preferences
- ✓ Student sees real-time congestion updates
- ✓ Preferences persist across sessions
- ✓ Changes blocked after closing date

### 7.2 Admin Flow
- ✓ Admin can manage topics (CRUD operations)
- ✓ Admin can set selection period dates
- ✓ Admin can view selection statistics
- ✓ Admin can export data for processing

### 7.3 System Behavior
- ✓ Real-time updates across all clients
- ✓ Accurate congestion calculations
- ✓ Responsive performance under load
- ✓ Graceful error handling

## 8. Future Enhancements (Out of Scope)

- Student authentication system
- Automated allocation algorithm
- Email notifications
- Historical analytics
- Advanced reporting dashboards
- Multi-language support
- Topic prerequisites/restrictions
- Student group formations