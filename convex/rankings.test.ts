/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi, describe } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import { createTestTopics, createTestSelectionPeriod } from "./share/admin_helpers"

describe("Rankings and Aggregates", () => {
  test("updateRankingsAggregate: creates new rankings", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Setup test data
    const { topicIds } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const topicIds = await createTestTopics(ctx, semesterId)
      return { topicIds }
    })
    
    // Create new rankings for a student
    const result = await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-1",
      newRankings: [
        { topicId: topicIds[0], position: 1 },
        { topicId: topicIds[1], position: 2 },
        { topicId: topicIds[2], position: 3 },
      ]
    })
    
    expect(result.success).toBe(true)
    
    // Verify metrics were updated
    const metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[0]
    })
    
    expect(metrics.studentCount).toBe(1)
    expect(metrics.averagePosition).toBe(1)
    expect(metrics.topChoiceCount).toBe(1)
    
    vi.useRealTimers()
  })

  test("updateRankingsAggregate: updates existing rankings", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const { topicIds } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const topicIds = await createTestTopics(ctx, semesterId)
      return { topicIds }
    })
    
    // Create initial rankings
    await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-2",
      newRankings: [
        { topicId: topicIds[0], position: 1 },
        { topicId: topicIds[1], position: 2 },
      ]
    })
    
    // Update rankings (student changed preferences)
    await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-2",
      oldRankings: [
        { topicId: topicIds[0], position: 1 },
        { topicId: topicIds[1], position: 2 },
      ],
      newRankings: [
        { topicId: topicIds[1], position: 1 }, // Moved topic 1 to first
        { topicId: topicIds[2], position: 2 }, // Added topic 2
      ]
    })
    
    // Verify old rankings removed and new ones added
    const topic0Metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[0]
    })
    const topic1Metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[1]
    })
    
    expect(topic0Metrics.studentCount).toBe(0) // Removed
    expect(topic1Metrics.topChoiceCount).toBe(1) // Now top choice
    
    vi.useRealTimers()
  })

  test("getTopicMetrics: calculates correct metrics", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const { topicIds } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const topicIds = await createTestTopics(ctx, semesterId)
      return { topicIds }
    })
    
    // Multiple students rank the same topic
    await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-a",
      newRankings: [{ topicId: topicIds[0], position: 1 }]
    })
    
    await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-b",
      newRankings: [{ topicId: topicIds[0], position: 2 }]
    })
    
    await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-c",
      newRankings: [{ topicId: topicIds[0], position: 3 }]
    })
    
    // Get metrics
    const metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[0]
    })
    
    expect(metrics.studentCount).toBe(3)
    expect(metrics.averagePosition).toBe(2) // (1+2+3)/3 = 2
    expect(metrics.topChoiceCount).toBe(1) // Only student-a ranked it #1
    expect(metrics.top3Count).toBe(3) // All 3 ranked it in top 3
    
    vi.useRealTimers()
  })

  test("getAllTopicMetrics: returns metrics for all topics", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const { topicIds } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const topicIds = await createTestTopics(ctx, semesterId)
      return { topicIds }
    })
    
    // Add rankings
    await t.mutation(api.rankings.updateRankingsAggregate, {
      studentId: "student-1",
      newRankings: [
        { topicId: topicIds[0], position: 1 },
        { topicId: topicIds[1], position: 2 },
      ]
    })
    
    // Get all metrics
    const allMetrics = await t.query(api.rankings.getAllTopicMetrics, {})
    
    expect(allMetrics.length).toBeGreaterThan(0)
    const topic0Metrics = allMetrics.find(m => m.topicId === topicIds[0])
    const topic1Metrics = allMetrics.find(m => m.topicId === topicIds[1])
    
    expect(topic0Metrics).toBeDefined()
    expect(topic0Metrics?.studentCount).toBe(1)
    expect(topic1Metrics).toBeDefined()
    expect(topic1Metrics?.studentCount).toBe(1)
    
    vi.useRealTimers()
  })

  test("rebuildRankingsAggregate: rebuilds from preferences", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const { topicIds, semesterId } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const now = Date.now()
      const future = now + 30 * 24 * 60 * 60 * 1000
      
      await createTestSelectionPeriod(ctx, semesterId, now, future)
      const topicIds = await createTestTopics(ctx, semesterId)
      
      // Create preferences directly
      await ctx.db.insert("preferences", {
        studentId: "student-rebuild-1",
        semesterId,
        topicOrder: [topicIds[0], topicIds[1]],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      
      return { topicIds, semesterId }
    })
    
    // Rebuild aggregate from preferences
    const result = await t.mutation(api.rankings.rebuildRankingsAggregate, {})
    
    expect(result.success).toBe(true)
    expect(result.message).toContain("rebuilt aggregate")
    
    // Verify metrics were rebuilt
    const metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[0]
    })
    
    expect(metrics.studentCount).toBe(1)
    expect(metrics.topChoiceCount).toBe(1)
    
    vi.useRealTimers()
  })

  test("getTopicMetrics: handles topic with no rankings", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const { topicIds } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const topicIds = await createTestTopics(ctx, semesterId)
      return { topicIds }
    })
    
    // Get metrics for topic with no rankings
    const metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[0]
    })
    
    expect(metrics.studentCount).toBe(0)
    expect(metrics.averagePosition).toBeNull()
    expect(metrics.topChoiceCount).toBe(0)
    expect(metrics.top3Count).toBe(0)
    
    vi.useRealTimers()
  })

  test("rankings: multiple students create competition", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const { topicIds } = await t.run(async (ctx: any) => {
      const semesterId = "2024-spring"
      const topicIds = await createTestTopics(ctx, semesterId)
      return { topicIds }
    })
    
    // 5 students all rank topic 0 as #1
    for (let i = 1; i <= 5; i++) {
      await t.mutation(api.rankings.updateRankingsAggregate, {
        studentId: `student-compete-${i}`,
        newRankings: [{ topicId: topicIds[0], position: 1 }]
      })
    }
    
    const metrics = await t.query(api.rankings.getTopicMetrics, {
      topicId: topicIds[0]
    })
    
    expect(metrics.studentCount).toBe(5)
    expect(metrics.averagePosition).toBe(1)
    expect(metrics.topChoiceCount).toBe(5) // All students ranked it #1
    expect(metrics.top3Count).toBe(5)
    
    vi.useRealTimers()
  })
})

