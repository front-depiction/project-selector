import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { ConvexHttpClient } from "convex/browser"
import { api } from "./_generated/api"

// Create a test client that connects to the local dev server
const client = new ConvexHttpClient(process.env.CONVEX_URL || "http://127.0.0.1:3210")

describe("Stats Functions", () => {
  it("should calculate landing page statistics correctly", async () => {
    try {
      const stats = await client.query(api.stats.getLandingStats, {})
      
      // Verify basic counts match seeded data
      expect(stats.totalTopics).toBe(10)
      expect(stats.totalStudents).toBe(60)
      expect(stats.totalSelections).toBe(600) // 60 students × 10 topics each
      
      // Verify averages
      expect(stats.averageSelectionsPerStudent).toBe(10)
      
      // Verify most/least popular topics arrays exist
      expect(stats.mostPopularTopics).toHaveLength(3)
      expect(stats.leastPopularTopics).toHaveLength(3)
      
      // Verify all topics have counts
       stats.mostPopularTopics.forEach((topic: { title: string; count: number }) => {
         expect(topic).toHaveProperty('title')
         expect(topic).toHaveProperty('count')
         expect(typeof topic.count).toBe('number')
       })
      
       stats.leastPopularTopics.forEach((topic: { title: string; count: number }) => {
         expect(topic).toHaveProperty('title')
         expect(topic).toHaveProperty('count')
         expect(typeof topic.count).toBe('number')
       })
    } catch (error) {
      if (error instanceof Error && error.message?.includes("Could not connect")) {
        console.warn("Skipping test - Convex dev server not running")
      } else {
        throw error
      }
    }
  })
})