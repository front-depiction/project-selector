# Project Topic Selection System - Instructions

## Overview

A disappointment minimization system for university project topic selection where students can rank their preferences for project topics with real-time congestion indicators to help them make informed choices.

## User Stories

### As a Student
- I want to enter my student ID to access the selection system
- I want to see all available project topics for the current semester
- I want to arrange topics in order of my preference using a drag-and-drop interface
- I want to see how many other students have selected each topic (congestion indicator)
- I want to understand my likelihood of getting each topic based on current selections
- I want to change my preferences anytime before the closing date
- I want my changes to be saved automatically in real-time

### As a Teacher/Administrator
- I want to configure which topics are available for the current semester
- I want to set the opening and closing dates for selections
- I want to see aggregate statistics on topic selections
- I want to run the allocation process after the closing date
- I want to export/view the final allocations

## Functional Requirements

### Student Interface
1. **Student ID Entry**
   - Simple text input for student ID
   - Format validation only (no authentication required)
   - Remember student's previous selections when they return

2. **Topic Selection Interface**
   - Display all available topics as a sortable list
   - Use existing `@components/ui/sortable-list.tsx` component
   - Drag-and-drop to reorder preferences
   - Show topic name and description
   - Real-time save of preference order

3. **Congestion Indicators**
   - Show count of students who have selected each topic
   - Calculate and display congestion ratio/likelihood
   - Update in real-time as other students make selections
   - Visual indicator (color coding or percentage) for congestion level

4. **Preference Management**
   - Allow reordering until closing date
   - Auto-save on every change
   - Show last updated timestamp
   - Confirm successful saves

### Admin Interface
1. **Topic Management**
   - Add/edit/remove topics for current semester
   - Set topic title and description
   - Set opening and closing dates
   - Activate/deactivate selection period

2. **Monitoring Dashboard**
   - View real-time selection statistics
   - See distribution of selections across topics
   - Export data for allocation processing

## Non-Functional Requirements

### Technical
- Built with Convex for real-time data synchronization and persistence
- Use existing sortable list component from the codebase
- Simple TypeScript for type safety
- Responsive design for desktop and mobile
- No external database needed (Convex handles everything)

### Performance
- Real-time updates without page refresh
- Handle concurrent users (expected: 200-500 students)
- Instant feedback on preference changes

### User Experience
- Intuitive drag-and-drop interface
- Clear visual feedback for congestion levels
- Accessibility compliant (keyboard navigation)
- Mobile-friendly interface

## Constraints

1. **No Authentication System** - Only student ID validation
2. **No Built-in Allocation Algorithm** - Focus on selection and congestion display
3. **Semester-based** - New topic list each semester
4. **No Maximum Capacity** - Topics don't have hard limits

## Acceptance Criteria

### Student Flow
- [ ] Student can enter their ID and access the selection interface
- [ ] Student can see all available topics with descriptions
- [ ] Student can drag and drop to reorder their preferences
- [ ] Student sees real-time congestion indicators for each topic
- [ ] Student's preferences are saved automatically
- [ ] Student can return and see/modify their previous selections
- [ ] System prevents changes after closing date

### Congestion Display
- [ ] Shows number of students who selected each topic
- [ ] Calculates congestion ratio: (students on topic X) / (total students / number of topics)
- [ ] Updates in real-time as selections change
- [ ] Provides visual indication of selection likelihood

### Admin Flow
- [ ] Admin can add/edit topics for the semester
- [ ] Admin can set opening and closing dates
- [ ] Admin can view selection statistics
- [ ] Admin can export selection data

## Congestion Calculation Formula

```
Expected Even Distribution = Total Students / Number of Topics
Congestion Ratio = Students on Topic X / Expected Even Distribution

Interpretation:
- Ratio < 0.5: Low congestion (high chance)
- Ratio 0.5-1.0: Moderate congestion  
- Ratio 1.0-1.5: High congestion
- Ratio > 1.5: Very high congestion (low chance)
```

## Initial Scope

Focus on core functionality:
1. Student selection interface with sortable list
2. Real-time congestion indicators
3. Basic admin interface for topic management
4. Data persistence with Convex

Future enhancements (not in initial scope):
- Email notifications
- Allocation algorithm integration
- Historical data analysis
- Advanced reporting