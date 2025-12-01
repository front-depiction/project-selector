# Loading Skeleton Components

This directory contains skeleton loading components that work with React Suspense boundaries to provide immediate visual feedback during data loading.

## Overview

With the ViewModel (VM) pattern that offloads async work, we need proper loading states to prevent pages from hanging. These skeleton components appear instantly while the real content loads in the background.

## Components

### DashboardSkeleton

**Location:** `DashboardSkeleton.tsx`
**Used in:** `/app/admin/page.tsx`

Skeleton for the admin dashboard featuring:
- Sidebar with navigation items
- Header with title and back button
- 4 metric cards
- 2 quick action sections

### StudentEntrySkeleton

**Location:** `StudentEntrySkeleton.tsx`
**Used in:** `/app/student/page.tsx`

Skeleton for the student ID entry page featuring:
- Centered card layout
- Header text
- Input field
- Submit button
- Help text area

### LandingPageSkeleton

**Location:** `LandingPageSkeleton.tsx`
**Used in:** `/app/page.tsx`

Skeleton for the main landing page featuring:
- Header with title and description
- Status banner with timer
- 2 action cards (Student/Admin portals)
- 3 statistics cards
- 2 analytics chart areas
- Footer

### StudentSelectionSkeleton

**Location:** `StudentSelectionSkeleton.tsx`
**Used in:** `/app/student/select/page.tsx`

Skeleton for the topic selection interface featuring:
- Back button
- Period info card
- 3 quick stats cards
- Ranking header with progress
- 5 topic cards with ranking details
- 2 help section cards

## Usage Pattern

All page components follow this pattern:

```tsx
import { Suspense } from "react"
import { PageComponent } from "@/components/..."
import { PageSkeleton } from "@/components/skeletons"

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageComponent />
    </Suspense>
  )
}
```

## Design Principles

1. **Match Layout**: Skeletons closely match the actual component's layout
2. **Instant Display**: No async operations - renders immediately
3. **shadcn Skeleton**: Uses the base `Skeleton` component from shadcn/ui
4. **Consistent Patterns**:
   - Text: `<Skeleton className="h-4 w-[200px]" />`
   - Cards: `<Skeleton className="h-[200px] w-full rounded-xl" />`
   - Avatars/Icons: `<Skeleton className="h-12 w-12 rounded-full" />`
   - Buttons: `<Skeleton className="h-10 w-32 rounded-md" />`

## Benefits

- **Perceived Performance**: Users see something instantly
- **No Hanging**: Pages don't freeze during data loading
- **Better UX**: Clear indication that content is loading
- **VM Compatible**: Works perfectly with ViewModel pattern

## Technical Notes

- All skeletons are client components (no "use client" needed as they're pure UI)
- No data fetching or async operations
- No dependencies on context or global state
- Fully responsive with Tailwind CSS
- Accessibility-friendly with proper ARIA attributes via shadcn
