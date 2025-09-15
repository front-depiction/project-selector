# Assignment System Feature Instructions

## Overview
Implement an assignment system that allows administrators to close the selection period early and assigns students to topics based on their preferences. The system should provide smooth visual feedback when assignments are made.

## User Stories

### As an Administrator
- I want to see an "Assign Now" button on the admin page to close the countdown early
- I want the system to automatically and evenly distribute students to topics when the period ends or is closed early
- I want to see the assignment results immediately after assignments are made

### As a Student
- I want to see a smooth animated transition when assignments are revealed
- I want to clearly see which topic I've been assigned to with a prominent display
- I want to see all topic assignments with student lists

## Functional Requirements

### Assignment Trigger
1. Add an "Assign Now" button to the admin page
2. Button should only be active during an open selection period
3. Clicking the button should immediately trigger the assignment process

### Assignment Process
1. Selection period should have a status field (ADT with discriminator)
   - Status types: "open", "assigned"
   - When assigned, link to an Assignment table via ID
2. Create an `assignPeriod` function that:
   - Randomly but evenly distributes students across topics
   - Considers student preferences from their rankings
   - Updates the selection period status
   - Creates assignment records

### Assignment Display
1. On the front page, when selection period transitions from "open" to "assigned":
   - Use Framer Motion for smooth animation
   - Display each topic with its list of assigned student IDs
   - If the current user has a registered student ID:
     - Show a prominent title: "You have been assigned to [topic]"
     - Highlight their assignment distinctively

## Technical Constraints
- Must follow the existing Convex database patterns
- Use TypeScript with immutable data structures
- Follow the functional programming style established in the codebase
- Animations should be smooth and performant

## Acceptance Criteria
1. Admin can close selection period early with "Assign Now" button
2. Assignments are distributed evenly across topics
3. Each student is assigned to exactly one topic
4. Assignment results are immediately visible with smooth animations
5. Students can clearly identify their assigned topic
6. System maintains data integrity throughout the assignment process