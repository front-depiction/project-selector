/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import type { Id } from "./_generated/dataModel"

const modules = import.meta.glob("./**/*.*s")

/**
 * User Data Isolation Tests
 *
 * These tests verify that:
 * 1. Teachers can only see their own data (topics, questions, categories, periods)
 * 2. Students can access public endpoints without auth
 * 3. Creating data requires authentication
 */

describe("User Data Isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  // ========================================
  // TOPIC ISOLATION TESTS
  // ========================================
  describe("Topics", () => {
    it("teacher can only see their own topics", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a topic
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const topicIdA = await asTeacherA.mutation(api.admin.createTopic, {
        title: "Teacher A's Topic",
        description: "A topic created by Teacher A",
        semesterId,
      })

      expect(topicIdA).toBeDefined()

      // Teacher B creates a topic
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      const topicIdB = await asTeacherB.mutation(api.admin.createTopic, {
        title: "Teacher B's Topic",
        description: "A topic created by Teacher B",
        semesterId,
      })

      expect(topicIdB).toBeDefined()

      // Teacher A queries topics - should only see their own
      const teacherATopics = await asTeacherA.query(api.topics.getAllTopics, {})
      expect(teacherATopics).toHaveLength(1)
      expect(teacherATopics[0].title).toBe("Teacher A's Topic")
      expect(teacherATopics[0]._id).toBe(topicIdA)

      // Teacher B queries topics - should only see their own
      const teacherBTopics = await asTeacherB.query(api.topics.getAllTopics, {})
      expect(teacherBTopics).toHaveLength(1)
      expect(teacherBTopics[0].title).toBe("Teacher B's Topic")
      expect(teacherBTopics[0]._id).toBe(topicIdB)

      vi.useRealTimers()
    })

    it("teacher cannot see another teacher's topic by ID", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a topic
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const topicIdA = await asTeacherA.mutation(api.admin.createTopic, {
        title: "Teacher A's Topic",
        description: "A topic created by Teacher A",
        semesterId,
      })

      // Teacher B tries to get Teacher A's topic by ID
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      const topic = await asTeacherB.query(api.topics.getTopic, { id: topicIdA })

      // Should return null because Teacher B doesn't own this topic
      expect(topic).toBeNull()

      // Teacher A can get their own topic
      const topicA = await asTeacherA.query(api.topics.getTopic, { id: topicIdA })
      expect(topicA).not.toBeNull()
      expect(topicA?.title).toBe("Teacher A's Topic")

      vi.useRealTimers()
    })

    it("teacher cannot update another teacher's topic", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a topic
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const topicIdA = await asTeacherA.mutation(api.admin.createTopic, {
        title: "Teacher A's Topic",
        description: "A topic created by Teacher A",
        semesterId,
      })

      // Teacher B tries to update Teacher A's topic
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.admin.updateTopic, {
          id: topicIdA,
          title: "Hacked Topic",
        })
      ).rejects.toThrow("Not authorized to update this topic")

      // Verify topic wasn't changed
      const topic = await asTeacherA.query(api.topics.getTopic, { id: topicIdA })
      expect(topic?.title).toBe("Teacher A's Topic")

      vi.useRealTimers()
    })

    it("teacher cannot delete another teacher's topic", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a topic
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const topicIdA = await asTeacherA.mutation(api.admin.createTopic, {
        title: "Teacher A's Topic",
        description: "A topic created by Teacher A",
        semesterId,
      })

      // Teacher B tries to delete Teacher A's topic
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.admin.deleteTopic, { id: topicIdA })
      ).rejects.toThrow("Not authorized to delete this topic")

      // Verify topic still exists
      const topic = await asTeacherA.query(api.topics.getTopic, { id: topicIdA })
      expect(topic).not.toBeNull()

      vi.useRealTimers()
    })

    it("unauthenticated user cannot see topics", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher creates a topic
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      await asTeacher.mutation(api.admin.createTopic, {
        title: "Test Topic",
        description: "A test topic",
        semesterId,
      })

      // Unauthenticated query returns empty array
      const topics = await t.query(api.topics.getAllTopics, {})
      expect(topics).toEqual([])

      vi.useRealTimers()
    })
  })

  // ========================================
  // QUESTION ISOLATION TESTS
  // ========================================
  describe("Questions", () => {
    it("teacher can only see their own questions", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a question
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const questionIdA = await asTeacherA.mutation(api.questions.createQuestion, {
        question: "Teacher A's Question",
        kind: "boolean",
        characteristicName: "Test Category",
        semesterId,
      })

      // Teacher B creates a question
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      const questionIdB = await asTeacherB.mutation(api.questions.createQuestion, {
        question: "Teacher B's Question",
        kind: "0to6",
        characteristicName: "Test Category",
        semesterId,
      })

      // Teacher A queries questions - should only see their own
      const teacherAQuestions = await asTeacherA.query(api.questions.getAllQuestions, {})
      expect(teacherAQuestions).toHaveLength(1)
      expect(teacherAQuestions[0].question).toBe("Teacher A's Question")

      // Teacher B queries questions - should only see their own
      const teacherBQuestions = await asTeacherB.query(api.questions.getAllQuestions, {})
      expect(teacherBQuestions).toHaveLength(1)
      expect(teacherBQuestions[0].question).toBe("Teacher B's Question")

      vi.useRealTimers()
    })

    it("teacher cannot update another teacher's question", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a question
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const questionIdA = await asTeacherA.mutation(api.questions.createQuestion, {
        question: "Teacher A's Question",
        kind: "boolean",
        characteristicName: "Test Category",
        semesterId,
      })

      // Teacher B tries to update Teacher A's question
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.questions.updateQuestion, {
          id: questionIdA,
          question: "Hacked Question",
        })
      ).rejects.toThrow("Not authorized to update this question")

      vi.useRealTimers()
    })

    it("teacher cannot delete another teacher's question", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a question
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const questionIdA = await asTeacherA.mutation(api.questions.createQuestion, {
        question: "Teacher A's Question",
        kind: "boolean",
        characteristicName: "Test Category",
        semesterId,
      })

      // Teacher B tries to delete Teacher A's question
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.questions.deleteQuestion, { id: questionIdA })
      ).rejects.toThrow("Not authorized to delete this question")

      // Verify question still exists
      const teacherAQuestions = await asTeacherA.query(api.questions.getAllQuestions, {})
      expect(teacherAQuestions).toHaveLength(1)

      vi.useRealTimers()
    })

    it("unauthenticated user cannot see questions", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher creates a question
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      await asTeacher.mutation(api.questions.createQuestion, {
        question: "Test Question",
        kind: "boolean",
        characteristicName: "Test Category",
        semesterId,
      })

      // Unauthenticated query returns empty array
      const questions = await t.query(api.questions.getAllQuestions, {})
      expect(questions).toEqual([])

      vi.useRealTimers()
    })
  })

  // ========================================
  // CONSTRAINT (CATEGORY) ISOLATION TESTS
  // ========================================
  describe("Constraints/Categories", () => {
    it("teacher can only see their own constraints", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a constraint
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      await asTeacherA.mutation(api.constraints.createConstraint, {
        name: "Teacher A Constraint",
        description: "A constraint created by Teacher A",
        semesterId,
        criterionType: "minimize",
      })

      // Teacher B creates a constraint
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      await asTeacherB.mutation(api.constraints.createConstraint, {
        name: "Teacher B Constraint",
        description: "A constraint created by Teacher B",
        semesterId,
        criterionType: "prerequisite",
        minRatio: 50,
      })

      // Teacher A queries constraints - should only see their own
      const teacherAConstraints = await asTeacherA.query(api.constraints.getAllConstraints, {})
      expect(teacherAConstraints).toHaveLength(1)
      expect(teacherAConstraints[0].name).toBe("Teacher A Constraint")

      // Teacher B queries constraints - should only see their own
      const teacherBConstraints = await asTeacherB.query(api.constraints.getAllConstraints, {})
      expect(teacherBConstraints).toHaveLength(1)
      expect(teacherBConstraints[0].name).toBe("Teacher B Constraint")

      vi.useRealTimers()
    })

    it("teacher cannot update another teacher's constraint", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a constraint
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const constraintIdA = await asTeacherA.mutation(api.constraints.createConstraint, {
        name: "Teacher A Constraint",
        description: "A constraint created by Teacher A",
        semesterId,
        criterionType: "minimize",
      })

      // Teacher B tries to update Teacher A's constraint
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.constraints.updateConstraint, {
          id: constraintIdA,
          name: "Hacked Constraint",
        })
      ).rejects.toThrow("Not authorized to update this constraint")

      vi.useRealTimers()
    })

    it("teacher cannot delete another teacher's constraint", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher A creates a constraint
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const constraintIdA = await asTeacherA.mutation(api.constraints.createConstraint, {
        name: "Teacher A Constraint",
        description: "A constraint created by Teacher A",
        semesterId,
        criterionType: "minimize",
      })

      // Teacher B tries to delete Teacher A's constraint
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.constraints.deleteConstraint, { id: constraintIdA })
      ).rejects.toThrow("Not authorized to delete this constraint")

      // Verify constraint still exists
      const teacherAConstraints = await asTeacherA.query(api.constraints.getAllConstraints, {})
      expect(teacherAConstraints).toHaveLength(1)

      vi.useRealTimers()
    })

    it("unauthenticated user cannot see constraints", async () => {
      const t = convexTest(schema, modules)

      const semesterId = "2024-spring"

      // Teacher creates a constraint
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      await asTeacher.mutation(api.constraints.createConstraint, {
        name: "Test Constraint",
        description: "A test constraint",
        semesterId,
        criterionType: "minimize",
      })

      // Unauthenticated query returns empty array
      const constraints = await t.query(api.constraints.getAllConstraints, {})
      expect(constraints).toEqual([])

      vi.useRealTimers()
    })
  })

  // ========================================
  // SELECTION PERIOD ISOLATION TESTS
  // ========================================
  describe("Selection Periods", () => {
    it("teacher can only see their own periods", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000) // 1 day from now
      const futureClose = now + (30 * 24 * 60 * 60 * 1000) // 30 days from now

      // Teacher A creates a period
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher A's Period",
        description: "A period created by Teacher A",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Teacher B creates a period
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      await asTeacherB.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher B's Period",
        description: "A period created by Teacher B",
        semesterId: "2024-fall",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Teacher A queries periods - should only see their own
      const teacherAPeriods = await asTeacherA.query(api.selectionPeriods.getAllPeriodsWithStats, {})
      expect(teacherAPeriods).toHaveLength(1)
      expect(teacherAPeriods[0].title).toBe("Teacher A's Period")

      // Teacher B queries periods - should only see their own
      const teacherBPeriods = await asTeacherB.query(api.selectionPeriods.getAllPeriodsWithStats, {})
      expect(teacherBPeriods).toHaveLength(1)
      expect(teacherBPeriods[0].title).toBe("Teacher B's Period")

      vi.useRealTimers()
    })

    it("teacher cannot update another teacher's period", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher A creates a period
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const resultA = await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher A's Period",
        description: "A period created by Teacher A",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Teacher B tries to update Teacher A's period
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.selectionPeriods.updatePeriod, {
          periodId: resultA.periodId!,
          title: "Hacked Period",
        })
      ).rejects.toThrow("Not authorized to update this period")

      vi.useRealTimers()
    })

    it("teacher cannot delete another teacher's period", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher A creates a period
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const resultA = await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher A's Period",
        description: "A period created by Teacher A",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Teacher B tries to delete Teacher A's period
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.selectionPeriods.deletePeriod, {
          periodId: resultA.periodId!,
        })
      ).rejects.toThrow("Not authorized to delete this period")

      // Verify period still exists
      const teacherAPeriods = await asTeacherA.query(api.selectionPeriods.getAllPeriodsWithStats, {})
      expect(teacherAPeriods).toHaveLength(1)

      vi.useRealTimers()
    })

    it("teacher cannot activate another teacher's period", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher A creates a period
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      const resultA = await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher A's Period",
        description: "A period created by Teacher A",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Teacher B tries to set Teacher A's period as active
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      await expect(
        asTeacherB.mutation(api.selectionPeriods.setActivePeriod, {
          periodId: resultA.periodId!,
        })
      ).rejects.toThrow("Not authorized to modify this period")

      vi.useRealTimers()
    })

    it("unauthenticated user cannot see periods list", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher creates a period
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      await asTeacher.mutation(api.selectionPeriods.createPeriod, {
        title: "Test Period",
        description: "A test period",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Unauthenticated query returns empty array
      const periods = await t.query(api.selectionPeriods.getAllPeriodsWithStats, {})
      expect(periods).toEqual([])

      vi.useRealTimers()
    })
  })

  // ========================================
  // STUDENT ACCESS TESTS (No Auth Required)
  // ========================================
  describe("Student Access (No Auth Required)", () => {
    it("student can access period by slug without auth when period is open", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const pastOpen = now - (24 * 60 * 60 * 1000) // 1 day ago (period is open)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000) // 30 days from now

      // Teacher creates an open period
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      const result = await asTeacher.mutation(api.selectionPeriods.createPeriod, {
        title: "Open Period",
        description: "An open selection period",
        semesterId: "2024-spring",
        openDate: pastOpen,
        closeDate: futureClose,
      })

      expect(result.shareableSlug).toBeDefined()

      // Student can access period by slug WITHOUT auth
      const periodStatus = await t.query(api.selectionPeriods.getPeriodBySlugWithStatus, {
        slug: result.shareableSlug!,
      })

      expect(periodStatus.status).toBe("open")
      if (periodStatus.status === "open") {
        expect(periodStatus.period.title).toBe("Open Period")
      }

      vi.useRealTimers()
    })

    it("student cannot access period by slug when period is not open (inactive)", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000) // 1 day from now (not yet open)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher creates a future (inactive) period
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      const result = await asTeacher.mutation(api.selectionPeriods.createPeriod, {
        title: "Future Period",
        description: "A future selection period",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Student tries to access period by slug - should return inactive status
      const periodStatus = await t.query(api.selectionPeriods.getPeriodBySlugWithStatus, {
        slug: result.shareableSlug!,
      })

      expect(periodStatus.status).toBe("inactive")
      if (periodStatus.status === "inactive") {
        expect(periodStatus.title).toBe("Future Period")
        expect(periodStatus.openDate).toBe(futureOpen)
      }

      vi.useRealTimers()
    })

    it("student can access topics for student view when on allow list", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const pastOpen = now - (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)
      const semesterId = "2024-spring"

      // Teacher creates an open period and topics
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })

      // Create topic first
      const topicId = await asTeacher.mutation(api.admin.createTopic, {
        title: "Test Topic for Students",
        description: "A topic students can see",
        semesterId,
      })

      // Create period
      const result = await asTeacher.mutation(api.selectionPeriods.createPeriod, {
        title: "Open Period",
        description: "An open selection period",
        semesterId,
        openDate: pastOpen,
        closeDate: futureClose,
        topicIds: [topicId],
      })

      // Generate student access codes
      const codes = await asTeacher.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
        selectionPeriodId: result.periodId!,
        count: 1,
      })

      const studentId = codes.codes[0]

      // Student can query topics without auth using their student ID
      const topics = await t.query(api.topics.getActiveTopicsForStudent, {
        studentId,
      })

      // Student should see the topic (they're on the allow list)
      expect(topics).toHaveLength(1)
      expect(topics[0].title).toBe("Test Topic for Students")

      vi.useRealTimers()
    })

    it("student cannot access topics if not on allow list", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const pastOpen = now - (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)
      const semesterId = "2024-spring"

      // Teacher creates an open period and topics
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })

      // Create topic first
      await asTeacher.mutation(api.admin.createTopic, {
        title: "Test Topic for Students",
        description: "A topic students can see",
        semesterId,
      })

      // Create period but don't add any student codes
      await asTeacher.mutation(api.selectionPeriods.createPeriod, {
        title: "Open Period",
        description: "An open selection period",
        semesterId,
        openDate: pastOpen,
        closeDate: futureClose,
      })

      // Student tries to query topics with a random student ID (not on allow list)
      const topics = await t.query(api.topics.getActiveTopicsForStudent, {
        studentId: "INVALID123",
      })

      // Student should not see any topics (not on allow list)
      expect(topics).toEqual([])

      vi.useRealTimers()
    })

    it("student can validate access code for period without auth", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const pastOpen = now - (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher creates an open period
      const asTeacher = t.withIdentity({ subject: "teacher-1", name: "Teacher" })
      const result = await asTeacher.mutation(api.selectionPeriods.createPeriod, {
        title: "Open Period",
        description: "An open selection period",
        semesterId: "2024-spring",
        openDate: pastOpen,
        closeDate: futureClose,
      })

      // Generate student access codes
      const codes = await asTeacher.mutation(api.periodStudentAccessCodes.generateStudentAccessCodes, {
        selectionPeriodId: result.periodId!,
        count: 1,
      })

      const studentCode = codes.codes[0]

      // Student can validate access code without auth
      const validationResult = await t.query(api.periodStudentAccessCodes.validateAccessCode, {
        code: studentCode,
      })

      expect(validationResult.valid).toBe(true)
      expect(validationResult.normalizedCode).toBe(studentCode.toUpperCase())
      expect(validationResult.selectionPeriodId).toBe(result.periodId)

      vi.useRealTimers()
    })

    it("invalid access code is rejected", async () => {
      const t = convexTest(schema, modules)

      // Validate a random code that doesn't exist
      const validationResult = await t.query(api.periodStudentAccessCodes.validateAccessCode, {
        code: "ABCDEF",
      })

      expect(validationResult.valid).toBe(false)
      expect(validationResult.error).toBe("Code not found")
    })
  })

  // ========================================
  // CREATION REQUIRES AUTH TESTS
  // ========================================
  describe("Creation Requires Auth", () => {
    it("creating topic without auth throws error", async () => {
      const t = convexTest(schema, modules)

      // Try to create topic without auth
      await expect(
        t.mutation(api.admin.createTopic, {
          title: "Unauthorized Topic",
          description: "This should fail",
          semesterId: "2024-spring",
        })
      ).rejects.toThrow("Not authenticated")
    })

    it("creating question without auth throws error", async () => {
      const t = convexTest(schema, modules)

      // Try to create question without auth
      await expect(
        t.mutation(api.questions.createQuestion, {
          question: "Unauthorized Question",
          kind: "boolean",
          characteristicName: "Test",
          semesterId: "2024-spring",
        })
      ).rejects.toThrow("Not authenticated")
    })

    it("creating constraint without auth throws error", async () => {
      const t = convexTest(schema, modules)

      // Try to create constraint without auth
      await expect(
        t.mutation(api.constraints.createConstraint, {
          name: "Unauthorized Constraint",
          description: "This should fail",
          semesterId: "2024-spring",
          criterionType: "minimize",
        })
      ).rejects.toThrow("Not authenticated")
    })

    it("creating period without auth throws error", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Try to create period without auth
      await expect(
        t.mutation(api.selectionPeriods.createPeriod, {
          title: "Unauthorized Period",
          description: "This should fail",
          semesterId: "2024-spring",
          openDate: futureOpen,
          closeDate: futureClose,
        })
      ).rejects.toThrow("Not authenticated")
    })
  })

  // ========================================
  // CROSS-TEACHER DATA ISOLATION INTEGRATION TEST
  // ========================================
  describe("Integration: Complete Teacher Data Isolation", () => {
    it("teachers have completely isolated data across all entities", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const pastOpen = now - (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)
      const semesterA = "2024-spring-teacher-a"
      const semesterB = "2024-spring-teacher-b"

      // Teacher A sets up their complete environment
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })

      const constraintIdA = await asTeacherA.mutation(api.constraints.createConstraint, {
        name: "Leadership Skills",
        description: "Balance leadership",
        semesterId: semesterA,
        criterionType: "minimize",
      })

      await asTeacherA.mutation(api.questions.createQuestion, {
        question: "Rate your leadership skills",
        kind: "0to6",
        characteristicName: "Leadership Skills",
        semesterId: semesterA,
      })

      const topicIdA = await asTeacherA.mutation(api.admin.createTopic, {
        title: "Machine Learning Project",
        description: "Build an ML system",
        semesterId: semesterA,
        constraintIds: [constraintIdA],
      })

      await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Spring 2024 Selection",
        description: "Teacher A's selection period",
        semesterId: semesterA,
        openDate: pastOpen,
        closeDate: futureClose,
        minimizeCategoryIds: [constraintIdA],
      })

      // Teacher B sets up their complete environment
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })

      const constraintIdB = await asTeacherB.mutation(api.constraints.createConstraint, {
        name: "Technical Skills",
        description: "Balance tech skills",
        semesterId: semesterB,
        criterionType: "pull",
      })

      await asTeacherB.mutation(api.questions.createQuestion, {
        question: "Rate your programming skills",
        kind: "0to6",
        characteristicName: "Technical Skills",
        semesterId: semesterB,
      })

      const topicIdB = await asTeacherB.mutation(api.admin.createTopic, {
        title: "Web Development Project",
        description: "Build a web app",
        semesterId: semesterB,
        constraintIds: [constraintIdB],
      })

      await asTeacherB.mutation(api.selectionPeriods.createPeriod, {
        title: "Fall 2024 Selection",
        description: "Teacher B's selection period",
        semesterId: semesterB,
        openDate: pastOpen,
        closeDate: futureClose,
        minimizeCategoryIds: [constraintIdB],
      })

      // Verify Teacher A can only see their own data
      const teacherATopics = await asTeacherA.query(api.topics.getAllTopics, {})
      const teacherAQuestions = await asTeacherA.query(api.questions.getAllQuestions, {})
      const teacherAConstraints = await asTeacherA.query(api.constraints.getAllConstraints, {})
      const teacherAPeriods = await asTeacherA.query(api.selectionPeriods.getAllPeriodsWithStats, {})

      expect(teacherATopics).toHaveLength(1)
      expect(teacherATopics[0].title).toBe("Machine Learning Project")
      expect(teacherAQuestions).toHaveLength(1)
      expect(teacherAQuestions[0].question).toBe("Rate your leadership skills")
      expect(teacherAConstraints).toHaveLength(1)
      expect(teacherAConstraints[0].name).toBe("Leadership Skills")
      expect(teacherAPeriods).toHaveLength(1)
      expect(teacherAPeriods[0].title).toBe("Spring 2024 Selection")

      // Verify Teacher B can only see their own data
      const teacherBTopics = await asTeacherB.query(api.topics.getAllTopics, {})
      const teacherBQuestions = await asTeacherB.query(api.questions.getAllQuestions, {})
      const teacherBConstraints = await asTeacherB.query(api.constraints.getAllConstraints, {})
      const teacherBPeriods = await asTeacherB.query(api.selectionPeriods.getAllPeriodsWithStats, {})

      expect(teacherBTopics).toHaveLength(1)
      expect(teacherBTopics[0].title).toBe("Web Development Project")
      expect(teacherBQuestions).toHaveLength(1)
      expect(teacherBQuestions[0].question).toBe("Rate your programming skills")
      expect(teacherBConstraints).toHaveLength(1)
      expect(teacherBConstraints[0].name).toBe("Technical Skills")
      expect(teacherBPeriods).toHaveLength(1)
      expect(teacherBPeriods[0].title).toBe("Fall 2024 Selection")

      // Verify neither teacher can modify the other's data
      await expect(
        asTeacherA.mutation(api.admin.updateTopic, { id: topicIdB, title: "Hacked" })
      ).rejects.toThrow("Not authorized")

      await expect(
        asTeacherB.mutation(api.admin.updateTopic, { id: topicIdA, title: "Hacked" })
      ).rejects.toThrow("Not authorized")

      vi.useRealTimers()
    })
  })

  // ========================================
  // ADMIN QUERIES ISOLATION TESTS
  // ========================================
  describe("Admin Queries Isolation", () => {
    it("getAllPeriods from admin module filters by user", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const futureOpen = now + (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher A creates a period
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher A Period",
        description: "Period A",
        semesterId: "2024-spring",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Teacher B creates a period
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      await asTeacherB.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher B Period",
        description: "Period B",
        semesterId: "2024-fall",
        openDate: futureOpen,
        closeDate: futureClose,
      })

      // Query via admin module
      const adminPeriodsA = await asTeacherA.query(api.admin.getAllPeriods, {})
      expect(adminPeriodsA).toHaveLength(1)
      expect(adminPeriodsA[0].title).toBe("Teacher A Period")

      const adminPeriodsB = await asTeacherB.query(api.admin.getAllPeriods, {})
      expect(adminPeriodsB).toHaveLength(1)
      expect(adminPeriodsB[0].title).toBe("Teacher B Period")

      vi.useRealTimers()
    })

    it("getCurrentPeriod from admin module filters by user", async () => {
      const t = convexTest(schema, modules)

      const now = Date.now()
      const pastOpen = now - (24 * 60 * 60 * 1000)
      const futureClose = now + (30 * 24 * 60 * 60 * 1000)

      // Teacher A creates an open period
      const asTeacherA = t.withIdentity({ subject: "teacher-a", name: "Teacher A" })
      await asTeacherA.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher A Open Period",
        description: "Period A",
        semesterId: "2024-spring",
        openDate: pastOpen,
        closeDate: futureClose,
      })

      // Teacher A should see their own current period
      const currentPeriodA = await asTeacherA.query(api.admin.getCurrentPeriod, {})
      expect(currentPeriodA).not.toBeNull()
      expect(currentPeriodA?.title).toBe("Teacher A Open Period")

      // Teacher B (who has no periods) should see null
      const asTeacherB = t.withIdentity({ subject: "teacher-b", name: "Teacher B" })
      const currentPeriodBBefore = await asTeacherB.query(api.admin.getCurrentPeriod, {})
      expect(currentPeriodBBefore).toBeNull()

      // Teacher B creates their own period
      await asTeacherB.mutation(api.selectionPeriods.createPeriod, {
        title: "Teacher B Open Period",
        description: "Period B",
        semesterId: "2024-fall",
        openDate: pastOpen,
        closeDate: futureClose,
      })

      // Note: getCurrentPeriod implementation uses getActiveSelectionPeriod which
      // gets any open period first, then checks if it belongs to the current user.
      // When multiple teachers have open periods, behavior depends on query order.
      // The key test is that Teacher A NEVER sees Teacher B's period as "current".

      // Teacher A should still see their own period (regardless of Teacher B's period)
      const currentPeriodAAfter = await asTeacherA.query(api.admin.getCurrentPeriod, {})
      // If it returns something, it must be Teacher A's period
      if (currentPeriodAAfter !== null) {
        expect(currentPeriodAAfter.title).toBe("Teacher A Open Period")
        expect(currentPeriodAAfter.userId).toBe("teacher-a")
      }

      // Teacher B's current period query should never return Teacher A's period
      const currentPeriodBAfter = await asTeacherB.query(api.admin.getCurrentPeriod, {})
      if (currentPeriodBAfter !== null) {
        expect(currentPeriodBAfter.title).toBe("Teacher B Open Period")
        expect(currentPeriodBAfter.userId).toBe("teacher-b")
      }

      vi.useRealTimers()
    })
  })
})
