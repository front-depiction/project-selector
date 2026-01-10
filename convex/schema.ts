import { defineSchema, defineTable } from "convex/server"
import * as Topic from "./schemas/Topic"
import * as Subtopic from "./schemas/Subtopic"
import * as Preference from "./schemas/Preference"
import * as SelectionPeriod from "./schemas/SelectionPeriod"
import * as RankingEvent from "./schemas/RankingEvent"
import * as Assignment from "./schemas/Assignment"
import * as Question from "./schemas/Question"
import * as QuestionTemplate from "./schemas/QuestionTemplate"
import * as TemplateQuestion from "./schemas/TemplateQuestion"
import * as SelectionQuestion from "./schemas/SelectionQuestion"
import * as StudentAnswer from "./schemas/StudentAnswer"
import * as User from "./schemas/User"
import * as TopicStudentAllowList from "./schemas/TopicStudentAllowList"
import * as TopicTeacherAllowList from "./schemas/TopicTeacherAllowList"
import * as Category from "./schemas/Category"

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

  questions: defineTable(Question.Question)
    .index("by_semester", ["semesterId"])
    .index("by_category", ["category"]),

  questionTemplates: defineTable(QuestionTemplate.QuestionTemplate)
    .index("by_semester", ["semesterId"]),

  categories: defineTable(Category.Category)
    .index("by_semester", ["semesterId"])
    .index("by_name", ["name"]),

  templateQuestions: defineTable(TemplateQuestion.TemplateQuestion)
    .index("by_template", ["templateId", "order"])
    .index("by_question", ["questionId"]),

  selectionQuestions: defineTable(SelectionQuestion.SelectionQuestion)
    .index("by_selection_period", ["selectionPeriodId", "order"])
    .index("by_question", ["questionId"]),

  studentAnswers: defineTable(StudentAnswer.StudentAnswer)
    .index("by_student_period", ["studentId", "selectionPeriodId"])
    .index("by_question_period", ["questionId", "selectionPeriodId"]),

  // === AUTH TABLES ===

  // Authenticated teachers/admins
  users: defineTable(User.User)
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  // Per-topic STUDENT allow-list (by student ID)
  topicStudentAllowList: defineTable(TopicStudentAllowList.TopicStudentAllowList)
    .index("by_topic", ["topicId"])
    .index("by_topic_studentId", ["topicId", "studentId"])
    .index("by_studentId", ["studentId"]),

  // Per-topic TEACHER allow-list (by email) for collaboration
  topicTeacherAllowList: defineTable(TopicTeacherAllowList.TopicTeacherAllowList)
    .index("by_topic", ["topicId"])
    .index("by_topic_email", ["topicId", "email"])
    .index("by_email", ["email"]),
})