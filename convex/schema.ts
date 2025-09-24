import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import * as Topic from "./schemas/Topic"
import * as Subtopic from "./schemas/Subtopic"
import * as Preference from "./schemas/Preference"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as RankingEvent from "./schemas/RankingEvent"
import * as Assignment from "./schemas/Assignment"

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    studentId: v.optional(v.string()),
    role: v.union(v.literal("student"), v.literal("admin")),
    createdAt: v.number(),
    lastSeen: v.number(),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("by_student_id", ["studentId"])
    .index("by_email", ["email"]),

  topics: defineTable(Topic.Topic)
    .index("by_semester", ["semesterId"])
    .index("by_active", ["isActive"]),

  subtopics: defineTable(Subtopic.Subtopic),

  preferences: defineTable(Preference.Preference)
    .index("by_student", ["studentId", "semesterId"])
    .index("by_semester", ["semesterId"]),

  selectionPeriods: defineTable(SelectionPeriod.SelectionPeriod)
    .index("by_active", ["isActive"])
    .index("by_semester", ["semesterId"]),

  rankingEvents: defineTable(RankingEvent.RankingEvent)
    .index("by_student", ["studentId"])
    .index("by_topic", ["topicId"])
    .index("by_semester", ["semesterId"]),

  assignments: defineTable(Assignment.Assignment)
    .index("by_period", ["periodId"])
    .index("by_student", ["studentId", "periodId"])
    .index("by_batch", ["batchId"])
    .index("by_topic", ["topicId", "periodId"])
})