# Assignment System Design

## 1. Schema Updates

### 1.1 SelectionPeriod Schema Enhancement

```typescript
// convex/schemas/SelectionPeriod.ts
export const SelectionPeriod = v.object({
  semesterId: v.string(),
  title: v.string(),
  description: v.string(),
  openDate: v.number(),
  closeDate: v.number(),
  isActive: v.boolean(),
  
  // New fields
  status: v.union(
    v.literal("open"),
    v.literal("assigned")
  ),
  scheduledFunctionId: v.id("_scheduled_functions"),
  assignmentBatchId: v.optional(v.string()) // Links to assignment batch
})
```

### 1.2 New Assignment Schema

```typescript
// convex/schemas/Assignment.ts
export const Assignment = v.object({
  periodId: v.id("selectionPeriods"),
  batchId: v.string(), // Groups assignments from same period
  studentId: v.string(),
  topicId: v.id("topics"),
  assignedAt: v.number(),
  originalRank: v.optional(v.number()) // Student's original preference rank
})
```

## 2. Core Functions

### 2.1 Period Management with Scheduling

```typescript
// convex/admin.ts

// Create period with automatic scheduling
export const createSelectionPeriod = mutation({
  args: { /* existing args */ },
  handler: async (ctx, args) => {
    // Create the period
    const periodId = await ctx.db.insert("selectionPeriods", {
      ...args,
      status: "open",
      scheduledFunctionId: null as any // Temporary
    })
    
    // Schedule automatic assignment
    const scheduledId = await ctx.scheduler.runAt(
      args.closeDate,
      internal.assignments.assignPeriod,
      { periodId }
    )
    
    // Update with scheduled function ID
    await ctx.db.patch(periodId, { scheduledFunctionId: scheduledId })
    
    return periodId
  }
})

// Update period with rescheduling
export const updateSelectionPeriod = mutation({
  args: { periodId: v.id("selectionPeriods"), closeDate: v.number() },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    
    // Cancel old schedule if date changed
    if (period.closeDate !== args.closeDate) {
      await ctx.scheduler.cancel(period.scheduledFunctionId)
      
      // Create new schedule
      const scheduledId = await ctx.scheduler.runAt(
        args.closeDate,
        internal.assignments.assignPeriod,
        { periodId: args.periodId }
      )
      
      await ctx.db.patch(args.periodId, { 
        closeDate: args.closeDate,
        scheduledFunctionId: scheduledId 
      })
    }
  }
})
```

### 2.2 Assignment Logic

```typescript
// convex/assignments.ts

export const assignNow = mutation({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    
    if (period.status === "assigned") {
      throw new Error("Period already assigned")
    }
    
    // Cancel scheduled function
    await ctx.scheduler.cancel(period.scheduledFunctionId)
    
    // Run assignment immediately
    return await assignPeriodInternal(ctx, args.periodId)
  }
})

export const assignPeriod = internalMutation({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    return await assignPeriodInternal(ctx, args.periodId)
  }
})

async function assignPeriodInternal(ctx, periodId) {
  const period = await ctx.db.get(periodId)
  
  if (period.status === "assigned") {
    return // Already assigned
  }
  
  // Get all preferences and topics
  const preferences = await ctx.db
    .query("preferences")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .collect()
  
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_semester", q => q.eq("semesterId", period.semesterId))
    .filter(q => q.eq(q.field("isActive"), true))
    .collect()
  
  // Simple even distribution
  const assignments = distributeStudents(preferences, topics)
  
  // Create batch ID
  const batchId = `batch_${periodId}_${Date.now()}`
  
  // Insert all assignments
  for (const assignment of assignments) {
    await ctx.db.insert("assignments", {
      periodId,
      batchId,
      studentId: assignment.studentId,
      topicId: assignment.topicId,
      assignedAt: Date.now(),
      originalRank: assignment.rank
    })
  }
  
  // Update period status
  await ctx.db.patch(periodId, { 
    status: "assigned",
    assignmentBatchId: batchId 
  })
  
  return batchId
}

function distributeStudents(preferences, topics) {
  const studentIds = [...new Set(preferences.map(p => p.studentId))]
  const topicIds = topics.map(t => t._id)
  
  // Shuffle students for random distribution
  const shuffled = [...studentIds].sort(() => Math.random() - 0.5)
  
  // Distribute evenly
  const assignments = []
  shuffled.forEach((studentId, index) => {
    const topicIndex = index % topicIds.length
    const topicId = topicIds[topicIndex]
    
    // Find original rank if exists
    const pref = preferences.find(
      p => p.studentId === studentId && p.topicId === topicId
    )
    
    assignments.push({
      studentId,
      topicId,
      rank: pref?.rank
    })
  })
  
  return assignments
}
```

### 2.3 Query Functions

```typescript
// convex/queries.ts

export const getAssignments = query({
  args: { periodId: v.id("selectionPeriods") },
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId)
    
    if (period.status !== "assigned") {
      return null
    }
    
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_period", q => q.eq("periodId", args.periodId))
      .collect()
    
    // Group by topic
    const byTopic = assignments.reduce((acc, a) => {
      if (!acc[a.topicId]) acc[a.topicId] = []
      acc[a.topicId].push(a)
      return acc
    }, {})
    
    return byTopic
  }
})

export const getMyAssignment = query({
  args: { 
    periodId: v.id("selectionPeriods"),
    studentId: v.string()
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("assignments")
      .withIndex("by_student", q => 
        q.eq("studentId", args.studentId)
         .eq("periodId", args.periodId)
      )
      .first()
    
    if (!assignment) return null
    
    const topic = await ctx.db.get(assignment.topicId)
    return { assignment, topic }
  }
})
```

## 3. Frontend Components

### 3.1 Admin Assign Now Button

```typescript
// components/admin/AssignNowButton.tsx
export function AssignNowButton({ periodId, status }) {
  const assignNow = useMutation(api.admin.assignNow)
  const [loading, setLoading] = useState(false)
  
  const handleAssign = async () => {
    setLoading(true)
    await assignNow({ periodId })
    setLoading(false)
  }
  
  return (
    <Button
      onClick={handleAssign}
      disabled={status !== "open" || loading}
    >
      {loading ? "Assigning..." : "Assign Now"}
    </Button>
  )
}
```

### 3.2 Assignment Display with Animation

```typescript
// components/AssignmentDisplay.tsx
export function AssignmentDisplay({ periodId, studentId }) {
  const assignments = useQuery(api.queries.getAssignments, { periodId })
  const myAssignment = useQuery(api.queries.getMyAssignment, { periodId, studentId })
  
  if (!assignments) return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {myAssignment && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="text-2xl font-bold mb-8"
        >
          You have been assigned to {myAssignment.topic.title}
        </motion.div>
      )}
      
      <div className="grid gap-4">
        {Object.entries(assignments).map(([topicId, students], index) => (
          <motion.div
            key={topicId}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <TopicAssignments topicId={topicId} students={students} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
```

## 4. Database Indexes

```typescript
// convex/schema.ts additions
assignments: defineTable(Assignment)
  .index("by_period", ["periodId"])
  .index("by_student", ["studentId", "periodId"])
  .index("by_batch", ["batchId"])
  .index("by_topic", ["topicId", "periodId"])
```

## 5. Error Handling

- Duplicate assignment prevention via unique index
- Graceful handling of missing preferences
- Transaction rollback on partial failure
- Clear error messages for admin actions

## 6. Migration Strategy

1. Add new fields to SelectionPeriod with defaults
2. Create Assignment table
3. For existing active periods, create scheduled functions
4. Set status based on current date vs closeDate