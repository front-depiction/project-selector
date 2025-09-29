import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { ConvexHttpClient } from "convex/browser"
import { api } from "./_generated/api"

// Create a test client that connects to the local dev server
const client = new ConvexHttpClient(process.env.CONVEX_URL || "http://127.0.0.1:3210")

describe("Topic Analytics Functions", () => {
  it("should calculate topic performance analytics correctly", async () => {
    const analytics = await client.query(api.topicAnalytics.getTopicPerformanceAnalytics, {})
    
    // Should return all 10 topics
    expect(analytics).toHaveLength(10)
    
    // Verify each topic has expected structure
    analytics.forEach((topic: { id: string; title: string; metrics: any }) => {
      expect(topic).toHaveProperty('id')
      expect(topic).toHaveProperty('title')
      expect(topic).toHaveProperty('metrics')

      const metrics = topic.metrics
      expect(metrics).toHaveProperty('totalSelections')
      expect(metrics.totalSelections).toBe(60) // All students select all topics

      expect(metrics).toHaveProperty('averagePosition')
      expect(typeof metrics.averagePosition).toBe('number')

      expect(metrics).toHaveProperty('firstChoiceCount')
      expect(typeof metrics.firstChoiceCount).toBe('number')

      expect(metrics).toHaveProperty('top3Count')
      expect(typeof metrics.top3Count).toBe('number')

      expect(metrics).toHaveProperty('performanceScore')
      expect(typeof metrics.performanceScore).toBe('number')

      expect(metrics).toHaveProperty('positionDistribution')
      expect(metrics.positionDistribution).toHaveLength(60)
    })
    
    // Verify sorted by performance score (highest first)
    for (let i = 0; i < analytics.length - 1; i++) {
      expect(analytics[i].metrics.performanceScore).toBeGreaterThanOrEqual(
        analytics[i + 1].metrics.performanceScore
      )
    }
  })
  
  it("should calculate detailed analytics for a specific topic", async () => {
    // Get all topics first
    const allAnalytics = await client.query(api.topicAnalytics.getTopicPerformanceAnalytics, {})
    
    const promises = allAnalytics.map(async (analytics) => {
      const detailed = await client.query(api.topicAnalytics.getTopicDetailedAnalytics, { topicId: analytics.id })
      
      expect(detailed.topic).toHaveProperty('id', analytics.id)
      expect(detailed.topic).toHaveProperty('title')
      expect(detailed.topic).toHaveProperty('description')

      expect(detailed.students).toHaveLength(60)
      detailed.students.forEach((student: { studentId: string; position: number }) => {
        expect(student).toHaveProperty('studentId')
        expect(student).toHaveProperty('position')
        expect(student.position).toBeGreaterThanOrEqual(1)
        expect(student.position).toBeLessThanOrEqual(10)
      })

      expect(detailed.summary.totalStudents).toBe(60)
      expect(typeof detailed.summary.averagePosition).toBe('number')
      expect(detailed.summary.averagePosition).toBeGreaterThanOrEqual(1)
      expect(detailed.summary.averagePosition).toBeLessThanOrEqual(10)
    })
    await Promise.all(promises)
    
  })
})