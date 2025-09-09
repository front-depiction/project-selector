# Project Topic Selection System - Simplified Technical Design

## 1. Architecture Overview

### 1.1 Simplified System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│  Student UI          │          Admin UI                 │
│  - Selection View    │  - Topic Management               │
│  - Sortable List     │  - Period Settings                │
│  - Congestion View   │  - Statistics Dashboard           │
├─────────────────────────────────────────────────────────┤
│                   Convex Backend                         │
│  - Real-time subscriptions                              │
│  - Mutations for updates                                │
│  - Queries for data fetching                            │
│  - Built-in persistence (no external DB)                │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow
1. **Student Selection Flow**
   - Student enters ID → Store in localStorage → Load preferences from Convex
   - Display topics with congestion → Real-time subscription
   - Drag-and-drop reorder → Auto-save to Convex → Broadcast update

2. **Real-time Updates**
   - Convex handles all real-time synchronization automatically
   - Any preference change triggers recalculation and broadcast
   - All connected clients receive updates instantly

## 2. Data Models (Simple TypeScript)

### 2.1 Type Definitions

```typescript
// types/index.ts
export interface Topic {
  _id: string
  title: string
  description: string
  semesterId: string
  isActive: boolean
}

export interface TopicWithCongestion extends Topic {
  studentCount: number
  congestionRatio: number
  likelihoodCategory: "low" | "moderate" | "high" | "very-high"
}

export interface StudentPreferences {
  _id?: string
  studentId: string
  semesterId: string
  topicOrder: string[] // Array of topic IDs in preference order
  lastUpdated: number
}

export interface SelectionPeriod {
  _id?: string
  semesterId: string
  openDate: number // Unix timestamp
  closeDate: number
  isActive: boolean
}
```

## 3. Convex Backend Design

### 3.1 Schema Definition

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
  })
    .index("by_semester", ["semesterId"])
    .index("by_active", ["isActive"]),
  
  preferences: defineTable({
    studentId: v.string(),
    semesterId: v.string(),
    topicOrder: v.array(v.id("topics")),
    lastUpdated: v.number()
  })
    .index("by_student", ["studentId", "semesterId"])
    .index("by_semester", ["semesterId"]),
  
  selectionPeriods: defineTable({
    semesterId: v.string(),
    openDate: v.number(),
    closeDate: v.number(),
    isActive: v.boolean()
  })
    .index("by_active", ["isActive"])
    .index("by_semester", ["semesterId"])
})
```

### 3.2 Core Functions

```typescript
// convex/topics.ts
import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const getActiveTopicsWithCongestion = query({
  handler: async (ctx) => {
    const activePeriod = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_active", q => q.eq("isActive", true))
      .first()
    
    if (!activePeriod) return []
    
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect()
    
    // Get all preferences for congestion calculation
    const allPreferences = await ctx.db
      .query("preferences")
      .withIndex("by_semester", q => q.eq("semesterId", activePeriod.semesterId))
      .collect()
    
    // Calculate congestion for each topic
    const totalStudents = allPreferences.length
    const expectedEven = totalStudents / topics.length
    
    return topics.map(topic => {
      const studentCount = allPreferences.filter(pref => 
        pref.topicOrder.includes(topic._id)
      ).length
      
      const congestionRatio = expectedEven > 0 ? studentCount / expectedEven : 0
      
      let likelihoodCategory: "low" | "moderate" | "high" | "very-high"
      if (congestionRatio < 0.5) likelihoodCategory = "low"
      else if (congestionRatio < 1.0) likelihoodCategory = "moderate"
      else if (congestionRatio < 1.5) likelihoodCategory = "high"
      else likelihoodCategory = "very-high"
      
      return {
        ...topic,
        studentCount,
        congestionRatio,
        likelihoodCategory
      }
    })
  }
})

// convex/preferences.ts
export const savePreferences = mutation({
  args: {
    studentId: v.string(),
    topicOrder: v.array(v.id("topics"))
  },
  handler: async (ctx, args) => {
    // Check if selection period is open
    const activePeriod = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_active", q => q.eq("isActive", true))
      .first()
    
    if (!activePeriod) {
      throw new Error("No active selection period")
    }
    
    const now = Date.now()
    if (now < activePeriod.openDate || now > activePeriod.closeDate) {
      throw new Error("Selection period is closed")
    }
    
    // Find existing preferences
    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_student", q => 
        q.eq("studentId", args.studentId)
         .eq("semesterId", activePeriod.semesterId)
      )
      .first()
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        topicOrder: args.topicOrder,
        lastUpdated: now
      })
    } else {
      await ctx.db.insert("preferences", {
        studentId: args.studentId,
        semesterId: activePeriod.semesterId,
        topicOrder: args.topicOrder,
        lastUpdated: now
      })
    }
    
    return { success: true }
  }
})

export const getPreferences = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const activePeriod = await ctx.db
      .query("selectionPeriods")
      .withIndex("by_active", q => q.eq("isActive", true))
      .first()
    
    if (!activePeriod) return null
    
    return await ctx.db
      .query("preferences")
      .withIndex("by_student", q => 
        q.eq("studentId", args.studentId)
         .eq("semesterId", activePeriod.semesterId)
      )
      .first()
  }
})
```

## 4. Frontend Components

### 4.1 Student Entry Component

```typescript
// app/student/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function StudentEntry() {
  const [studentId, setStudentId] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  
  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Simple validation
    if (!studentId.match(/^[A-Z0-9]{6,12}$/)) {
      setError("Student ID must be 6-12 alphanumeric characters")
      return
    }
    
    // Store in localStorage and navigate
    localStorage.setItem("studentId", studentId)
    router.push("/student/select")
  }
  
  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6">Project Topic Selection</h1>
      <form onSubmit={validateAndSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Student ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value.toUpperCase())
              setError("")
            }}
            placeholder="Enter your Student ID"
            className="w-full px-3 py-2 border rounded-lg"
            pattern="[A-Z0-9]{6,12}"
            required
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Continue to Selection
        </button>
      </form>
    </div>
  )
}
```

### 4.2 Selection Page with Sortable List

```typescript
// app/student/select/page.tsx
"use client"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SortableList, SortableListItem } from "@/components/ui/sortable-list"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SelectTopics() {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string>("")
  const [items, setItems] = useState<Item[]>([])
  const [saving, setSaving] = useState(false)
  
  // Get data from Convex
  const topics = useQuery(api.topics.getActiveTopicsWithCongestion)
  const preferences = useQuery(api.preferences.getPreferences, 
    studentId ? { studentId } : "skip"
  )
  const savePreferences = useMutation(api.preferences.savePreferences)
  
  // Check for student ID
  useEffect(() => {
    const id = localStorage.getItem("studentId")
    if (!id) {
      router.push("/student")
    } else {
      setStudentId(id)
    }
  }, [router])
  
  // Convert topics to sortable items and apply saved order
  useEffect(() => {
    if (!topics) return
    
    let sortedTopics = [...topics]
    
    // If user has preferences, sort topics according to their saved order
    if (preferences?.topicOrder) {
      sortedTopics.sort((a, b) => {
        const aIndex = preferences.topicOrder.indexOf(a._id)
        const bIndex = preferences.topicOrder.indexOf(b._id)
        
        // Put selected topics first in saved order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return 0
      })
    }
    
    setItems(sortedTopics.map((topic, index) => ({
      id: topic._id,
      text: topic.title,
      description: topic.description,
      checked: false,
      studentCount: topic.studentCount,
      congestionRatio: topic.congestionRatio,
      likelihoodCategory: topic.likelihoodCategory
    })))
  }, [topics, preferences])
  
  // Auto-save on reorder
  const handleReorder = async (newItems: Item[]) => {
    setItems(newItems)
    setSaving(true)
    
    try {
      const topicOrder = newItems.map(item => item.id)
      await savePreferences({ studentId, topicOrder })
    } catch (error) {
      console.error("Failed to save preferences:", error)
    } finally {
      setSaving(false)
    }
  }
  
  // Congestion indicator component
  const CongestionIndicator = ({ item }: { item: Item }) => {
    const colors = {
      low: "text-green-500 bg-green-50",
      moderate: "text-yellow-600 bg-yellow-50",
      high: "text-orange-500 bg-orange-50",
      "very-high": "text-red-500 bg-red-50"
    }
    
    const labels = {
      low: "Low Risk",
      moderate: "Moderate",
      high: "High Risk",
      "very-high": "Very High"
    }
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {item.studentCount} selected
        </span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors[item.likelihoodCategory]}`}>
          {labels[item.likelihoodCategory]}
        </span>
      </div>
    )
  }
  
  if (!topics) {
    return <div className="p-8">Loading...</div>
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Select Your Project Preferences</h1>
        <p className="text-gray-600 mt-2">
          Drag and drop topics to order them by preference. 
          Your first choice should be at the top.
        </p>
        {saving && (
          <div className="mt-2 text-sm text-blue-600">Saving...</div>
        )}
      </div>
      
      <SortableList
        items={items}
        setItems={handleReorder}
        onCompleteItem={() => {}}
        renderItem={(item, order, onCompleteItem, onRemoveItem) => (
          <SortableListItem
            item={item}
            order={order}
            onCompleteItem={onCompleteItem}
            onRemoveItem={onRemoveItem}
            handleDrag={() => {}}
            renderExtra={(item) => <CongestionIndicator item={item} />}
          />
        )}
      />
    </div>
  )
}
```

## 5. Admin Interface

### 5.1 Simple Admin Dashboard

```typescript
// app/admin/page.tsx
"use client"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AdminDashboard() {
  const topics = useQuery(api.admin.getAllTopics)
  const stats = useQuery(api.admin.getStatistics)
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Topic Management Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Topics</h2>
        {/* Topic CRUD interface */}
      </section>
      
      {/* Statistics Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Selection Statistics</h2>
        {/* Display stats and charts */}
      </section>
      
      {/* Export Section */}
      <section>
        <button className="bg-green-500 text-white px-4 py-2 rounded">
          Export to CSV
        </button>
      </section>
    </div>
  )
}
```

## 6. Error Handling

### 6.1 Simple Error Messages

```typescript
// utils/errors.ts
export const errorMessages = {
  INVALID_STUDENT_ID: "Please enter a valid student ID (6-12 alphanumeric characters)",
  PERIOD_CLOSED: "The selection period has ended. No further changes allowed.",
  NO_ACTIVE_PERIOD: "There is no active selection period at this time.",
  SAVE_FAILED: "Failed to save your preferences. Please try again.",
  NETWORK_ERROR: "Connection lost. Your changes will be saved when reconnected."
}

export function handleError(error: any): string {
  if (error.message?.includes("period is closed")) {
    return errorMessages.PERIOD_CLOSED
  }
  if (error.message?.includes("No active")) {
    return errorMessages.NO_ACTIVE_PERIOD
  }
  return errorMessages.SAVE_FAILED
}
```

## 7. Testing Strategy

### 7.1 Simple Test Cases

```typescript
// __tests__/selection.test.ts
describe("Selection Flow", () => {
  test("validates student ID format", () => {
    expect(isValidStudentId("ABC123")).toBe(true)
    expect(isValidStudentId("abc")).toBe(false)
    expect(isValidStudentId("12345678901234")).toBe(false)
  })
  
  test("calculates congestion correctly", () => {
    const ratio = calculateCongestion(30, 100, 10)
    expect(ratio).toBe(3.0) // 30 / (100/10) = 3.0
  })
})
```

## 8. Deployment

### 8.1 Environment Setup

```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-app.convex.cloud
```

### 8.2 Deployment Steps

1. Deploy Convex backend: `npx convex deploy`
2. Deploy Next.js to Vercel
3. Set environment variables in Vercel
4. Test real-time functionality

## 9. Key Simplifications

### What We Removed
- ❌ Effect library and complex patterns
- ❌ Service layers and dependency injection
- ❌ Complex error types and handling
- ❌ External database (PostgreSQL)
- ❌ Branded types and schema validation

### What We Keep
- ✅ Convex for everything backend
- ✅ Simple TypeScript interfaces
- ✅ Existing SortableList component
- ✅ Real-time updates (built into Convex)
- ✅ Basic validation and error messages

## 10. Performance Considerations

- Convex handles scaling automatically
- Real-time subscriptions are optimized by Convex
- Simple debouncing for preference saves
- Minimal frontend state management

This simplified design focuses on getting a working system quickly while maintaining all core functionality.