import { defineSchema, defineTable } from "convex/server"
import * as Topic from "./schemas/Topic"
import * as Subtopic from "./schemas/Subtopic"
import * as Preference from "./schemas/Preference"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as RankingEvent from "./schemas/RankingEvent"
import * as Assignment from "./schemas/Assignment"
import * as Prerequisite from "./schemas/Prerequisite"
import * as PreferencePrerequisite from "./schemas/PreferencePrerequisite"
import * as StudentPrerequisite from "./schemas/StudentPrerequisite"

export default defineSchema({
  topics: defineTable(Topic.Topic)
    .index("by_semester", ["semesterId"])
    .index("by_active", ["isActive"]),

  subtopics: defineTable(Subtopic.Subtopic),

  prerequisites: defineTable(Prerequisite.Prerequisite),

  studentPrerequisites: defineTable(StudentPrerequisite.StudentPrerequisite)
    .index("by_student", ["studentId"])
    .index("by_prerequisite", ["prerequisiteId"])
    .index("by_student_prerequisite", ["studentId", "prerequisiteId"]),

  preferencePrerequisites: defineTable(PreferencePrerequisite.PreferencePrerequisite)
    .index("by_preference", ["preferenceId"])
    .index("by_prerequisite", ["prerequisiteId"])
    .index("by_met", ["isMet"]),

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
    .index("by_topic", ["topicId", "periodId"])
})