import { MutationCtx } from "../_generated/server"
import type { DataModel, Id } from "../_generated/dataModel"
import { internal } from "../_generated/api"
import * as Topic from "../schemas/Topic"
import * as SelectionPeriod from "../schemas/SelectionPeriod"
import * as Preference from "../schemas/Preference"
import { pipe } from "effect/Function"
import * as Array from "effect/Array"
import { shuffleArray } from "../lib/utils"
import { createRankingEventsAndUpdateAggregate } from "./rankings"

/**
 * Sample topics for seeding test data.
 */
export const TOPICDATA = [
  {
    title: "Machine Learning Recommendation System",
    description: "Build a recommendation system using collaborative filtering and deep learning techniques"
  },
  {
    title: "Blockchain Smart Contracts",
    description: "Develop and deploy smart contracts on Ethereum for decentralized applications"
  },
  {
    title: "Mobile AR Gaming Application",
    description: "Create an augmented reality mobile game using Unity and ARCore/ARKit"
  },
  {
    title: "Cloud-Native Microservices",
    description: "Design and implement a microservices architecture using Kubernetes and service mesh"
  },
  {
    title: "Natural Language Processing Chatbot",
    description: "Build an intelligent chatbot using transformer models and conversational AI"
  },
  {
    title: "Computer Vision for Medical Imaging",
    description: "Apply deep learning to medical image analysis for disease detection"
  },
  {
    title: "IoT Smart Home System",
    description: "Develop an integrated IoT system for home automation and monitoring"
  },
  {
    title: "Quantum Computing Algorithms",
    description: "Implement quantum algorithms and explore quantum supremacy applications"
  },
  {
    title: "Cybersecurity Threat Detection",
    description: "Build an AI-powered system for detecting and preventing cyber threats"
  },
  {
    title: "Data Visualization Dashboard",
    description: "Create interactive data visualization tools for business intelligence"
  }
] as const

/**
 * Helper to create a test selection period and schedule assignment.
 * Optimized to reduce database operations.
 */
export async function createTestSelectionPeriod(
  ctx: MutationCtx,
  semesterId: string,
  now: number,
  closeDate: number,
  options?: {
    rankingsEnabled?: boolean
  }
) {
  const inactivePeriod = SelectionPeriod.makeInactive({
    semesterId,
    openDate: now,
    closeDate,
    title: "Test Period",
    description: "This is an auto generated test period",
    rankingsEnabled: options?.rankingsEnabled,
  })
  const periodId = await ctx.db.insert("selectionPeriods", inactivePeriod)

  const scheduledId = await ctx.scheduler.runAt(
    closeDate,
    internal.assignments.assignPeriod,
    { periodId }
  )

  await pipe(
    inactivePeriod,
    period => SelectionPeriod.toOpen(period, scheduledId),
    openPeriod => ctx.db.replace(periodId, openPeriod)
  )

  return periodId
}

/**
 * Helper to create test topics for a given semester.
 */
export const createTestTopics = (ctx: MutationCtx, semesterId: string) =>
  pipe(
    TOPICDATA,
    Array.map(data => Topic.make({
      ...data,
      semesterId,
      isActive: true
    })),
    topics => Promise.all(topics.map(topic => ctx.db.insert("topics", topic)))
  )

/**
 * Generates test student data.
 */
export const generateTestStudents = (topicIds: readonly Id<"topics">[], numOfStudents: number) =>
  Array.makeBy(numOfStudents, index => ({
    id: `student-${index + 1}`,
    topics: shuffleArray([...topicIds])
  }))

/**
 * Inserts test preferences for students.
 */
export const insertTestPreferences = (
  ctx: MutationCtx,
  students: { id: string, topics: readonly Id<"topics">[] }[],
  semesterId: string
) =>
  pipe(
    students,
    Array.map(student =>
      Preference.make({
        studentId: student.id,
        semesterId,
        topicOrder: student.topics
      })
    ),
    Array.map(pref => ctx.db.insert("preferences", pref)),
    ps => Promise.all(ps)
  )

/**
 * Schedules ranking batch for test students.
 */
export const createTestRankings = (
  ctx: MutationCtx,
  students: { id: string, topics: readonly Id<"topics">[] }[],
  semesterId: string
) =>
  pipe(
    students,
    Array.map(s => ({
      studentId: s.id,
      semesterId,
      topicOrder: [...s.topics] // Convert readonly to mutable
    })),
    students => Promise.all(
      students.map(({ studentId, semesterId, topicOrder }) =>
        createRankingEventsAndUpdateAggregate(ctx, { studentId, semesterId, topicOrder })
      )
    )
  )

/**
 * Helper: Delete all items from a table.
 */
export const deleteAllFromTable = <T extends keyof DataModel>(
  ctx: MutationCtx,
  tableName: T
) =>
  ctx.db.query(tableName).collect()
    .then(Array.map(item => ctx.db.delete(item._id)))
    .then(ps => Promise.all(ps))

/**
 * Helper: Delete all scheduled functions.
 */
export const cancelAllScheduled = (ctx: MutationCtx) =>
  ctx.db.system.query("_scheduled_functions").collect()
    .then(Array.map(fn => ctx.scheduler.cancel(fn._id)))
    .then(ps => Promise.all(ps))