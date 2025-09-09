# Project Topic Selection System - Simplified Implementation Plan

## Overview

Simplified implementation using Convex for all backend needs - no Effect, no PostgreSQL, just straightforward TypeScript with Convex's real-time capabilities.

## Phase 1: Convex Setup ✅ Priority: Critical

### 1.1 Initialize Convex
- [ ] Install Convex: `npm install convex`
- [ ] Run `npx convex dev` to initialize
- [ ] Configure environment variables
- [ ] Test connection

### 1.2 Create Schema
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  topics: defineTable({
    title: v.string(),
    description: v.string(),
    semesterId: v.string(),
    isActive: v.boolean(),
  }).index("by_semester", ["semesterId"]),
  
  preferences: defineTable({
    studentId: v.string(),
    semesterId: v.string(),
    topicOrder: v.array(v.id("topics")), // Simple array of topic IDs in order
    lastUpdated: v.number()
  }).index("by_student", ["studentId", "semesterId"]),
  
  selectionPeriods: defineTable({
    semesterId: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean()
  }).index("by_active", ["isActive"])
})
```

**Estimated Time**: 1 hour  
**Success Criteria**: Convex connected and schema deployed

## Phase 2: Core Backend Functions ✅ Priority: Critical

### 2.1 Topic Functions
```typescript
// convex/topics.ts
export const getActiveTopics = query({
  handler: async (ctx) => {
    // Get active topics with selection counts
  }
})

export const getTopicsWithCongestion = query({
  handler: async (ctx) => {
    // Return topics with congestion data
  }
})
```

### 2.2 Preference Functions
```typescript
// convex/preferences.ts
export const savePreferences = mutation({
  args: { 
    studentId: v.string(), 
    topicOrder: v.array(v.id("topics"))
  },
  handler: async (ctx, args) => {
    // Validate period is open
    // Save preferences
    // Return success
  }
})

export const getPreferences = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    // Get student's saved order
  }
})
```

### 2.3 Real-time Congestion
```typescript
// convex/congestion.ts
export const getCongestionData = query({
  handler: async (ctx) => {
    // Calculate congestion for all topics
    // Return real-time counts and ratios
  }
})
```

**Estimated Time**: 2-3 hours  
**Success Criteria**: All Convex functions working

## Phase 3: Student Interface ✅ Priority: Critical

### 3.1 Student Entry Page
```typescript
// app/student/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function StudentEntry() {
  const [studentId, setStudentId] = useState("")
  const router = useRouter()
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (studentId.match(/^[A-Z0-9]{6,12}$/)) {
      localStorage.setItem("studentId", studentId)
      router.push("/student/select")
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value.toUpperCase())}
        placeholder="Enter Student ID"
        pattern="[A-Z0-9]{6,12}"
        required
      />
      <button type="submit">Continue</button>
    </form>
  )
}
```

### 3.2 Selection Page with Sortable List
```typescript
// app/student/select/page.tsx
"use client"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SortableList } from "@/components/ui/sortable-list"
import { useEffect, useState } from "react"

export default function SelectTopics() {
  const studentId = localStorage.getItem("studentId")
  const topics = useQuery(api.topics.getTopicsWithCongestion)
  const preferences = useQuery(api.preferences.getPreferences, { studentId })
  const savePreferences = useMutation(api.preferences.savePreferences)
  const [items, setItems] = useState([])
  
  // Convert topics to sortable items
  useEffect(() => {
    if (topics) {
      setItems(topics.map(topic => ({
        id: topic._id,
        text: topic.title,
        description: topic.description,
        checked: false,
        studentCount: topic.studentCount,
        congestionRatio: topic.congestionRatio
      })))
    }
  }, [topics])
  
  // Auto-save on reorder
  const handleReorder = async (newItems) => {
    setItems(newItems)
    const topicOrder = newItems.map(item => item.id)
    await savePreferences({ studentId, topicOrder })
  }
  
  return (
    <div>
      <h1>Select Your Project Preferences</h1>
      <SortableList
        items={items}
        setItems={handleReorder}
        renderItem={(item) => (
          <div className="flex justify-between">
            <span>{item.text}</span>
            <CongestionIndicator 
              count={item.studentCount}
              ratio={item.congestionRatio}
            />
          </div>
        )}
      />
    </div>
  )
}
```

### 3.3 Congestion Indicator Component
```typescript
// components/CongestionIndicator.tsx
export function CongestionIndicator({ count, ratio }) {
  const getColor = () => {
    if (ratio < 0.5) return "text-green-500"
    if (ratio < 1.0) return "text-yellow-500"
    if (ratio < 1.5) return "text-orange-500"
    return "text-red-500"
  }
  
  const getLabel = () => {
    if (ratio < 0.5) return "Low Risk"
    if (ratio < 1.0) return "Moderate"
    if (ratio < 1.5) return "High Risk"
    return "Very High Risk"
  }
  
  return (
    <div className={`flex items-center gap-2 ${getColor()}`}>
      <span>{count} selected</span>
      <span>{getLabel()}</span>
    </div>
  )
}
```

**Estimated Time**: 3-4 hours  
**Success Criteria**: Students can select and reorder with live updates

## Phase 4: Admin Interface ⚙️ Priority: Medium

### 4.1 Simple Admin Dashboard
```typescript
// app/admin/page.tsx
export default function AdminDashboard() {
  const topics = useQuery(api.topics.getAllTopics)
  const stats = useQuery(api.admin.getStatistics)
  
  return (
    <div>
      <TopicManager topics={topics} />
      <SelectionStats stats={stats} />
      <PeriodSettings />
    </div>
  )
}
```

### 4.2 Topic Management
- Add/Edit/Delete topics
- Set semester
- Activate/Deactivate

### 4.3 Export Function
```typescript
const exportToCSV = () => {
  // Get all preferences
  // Format as CSV
  // Download
}
```

**Estimated Time**: 2-3 hours  
**Success Criteria**: Admin can manage topics and export data

## Phase 5: Polish & Testing ⚙️ Priority: High

### 5.1 UI Improvements
- [ ] Loading states
- [ ] Error handling
- [ ] Success feedback
- [ ] Mobile responsive

### 5.2 Testing
- [ ] Test student flow
- [ ] Test concurrent updates
- [ ] Test period boundaries

**Estimated Time**: 2 hours  
**Success Criteria**: Smooth user experience

## Simplified Development Order

1. **Phase 1**: Convex Setup (1 hour)
2. **Phase 2**: Backend Functions (2-3 hours)
3. **Phase 3**: Student Interface (3-4 hours)
4. **Phase 4**: Admin Interface (2-3 hours)
5. **Phase 5**: Polish (2 hours)

**Total Time**: 10-13 hours (vs 25-30 with Effect)

## Key Simplifications

### What We Removed
- ❌ Effect library and patterns
- ❌ Complex service layers
- ❌ PostgreSQL planning
- ❌ Branded types
- ❌ Schema validation libraries
- ❌ Complex error handling

### What We Keep
- ✅ Convex for everything backend
- ✅ Simple TypeScript
- ✅ Your existing SortableList component
- ✅ Real-time updates (built into Convex)
- ✅ Simple validation
- ✅ Straightforward error messages

## Quick Start Commands

```bash
# Install Convex
npm install convex

# Start Convex dev server
npx convex dev

# In another terminal, start Next.js
npm run dev
```

## Current Status

Ready to begin implementation with this simplified approach. No complex patterns, just Convex + React + your existing components.

## Next Steps

1. Install Convex
2. Create schema
3. Build student interface
4. Add admin features
5. Deploy

This approach is much more straightforward and will get you a working system quickly!