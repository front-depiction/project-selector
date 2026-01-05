import { defineSchema, defineTable } from "convex/server"
import * as Topic from "./schemas/Topic"
import * as Subtopic from "./schemas/Subtopic"
import * as Preference from "./schemas/Preference"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as RankingEvent from "./schemas/RankingEvent"
import * as Assignment from "./schemas/Assignment"
import * as User from "./schemas/User"
import * as AllowListEntry from "./schemas/AllowListEntry"
import * as TopicAllowListEntry from "./schemas/TopicAllowListEntry"

export default defineSchema({
  topics: defineTable(Topic.Topic)
    .index("by_semester", ["semesterId"])
    .index("by_active", ["isActive"]),

  subtopics: defineTable(Subtopic.Subtopic),

  preferences: defineTable(Preference.Preference)
    .index("by_student", ["studentId", "semesterId"])
    .index("by_semester", ["semesterId"]),

  selectionPeriods: defineTable(SelectionPeriod.SelectionPeriod)
    .index("by_kind", ["kind"])
    .index("by_semester", ["semesterId"]),

  rankingEvents: defineTable(RankingEvent.RankingEvent)
    .index("by_student", ["studentId"])
    .index("by_topic", ["topicId"])
    .index("by_semester", ["semesterId"]),

  assignments: defineTable(Assignment.Assignment)
    .index("by_period", ["periodId"])
    .index("by_student", ["studentId", "periodId"])
    .index("by_batch", ["batchId"])
    .index("by_topic", ["topicId", "periodId"]),

  // Auth tables
  users: defineTable(User.User)
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  allowList: defineTable(AllowListEntry.AllowListEntry)
    .index("by_email", ["email"]),

  // Per-topic allow-lists
  topicAllowList: defineTable(TopicAllowListEntry.TopicAllowListEntry)
    .index("by_topic", ["topicId"])
    .index("by_topic_email", ["topicId", "email"])
    .index("by_email", ["email"]),
})