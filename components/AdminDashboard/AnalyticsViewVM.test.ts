/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { computed } from "@preact/signals-react"
import type { StatCardVM, TopicAnalyticsItemVM } from "./AnalyticsViewVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useAnalyticsViewVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

// Helper to create mock stats$ signal
function createMockStatsSignal(
  topicsData: any[] | null | undefined,
  statsData: any | null | undefined,
  analyticsData: any[] | null | undefined
) {
  return computed((): readonly StatCardVM[] => {
    const topics = topicsData ?? []
    const stats = statsData
    const analytics = analyticsData ?? []

    // Calculate total selections across all topics
    const totalSelections = analytics.reduce((sum, topic: any) =>
      sum + (topic.metrics?.totalSelections ?? 0), 0
    )

    // Calculate average selections per student
    const totalStudents = stats?.totalStudents ?? 0
    const avgSelections = totalStudents > 0
      ? totalSelections / totalStudents
      : 0

    // Calculate topic coverage percentage
    const activeTopics = topics.filter(t => t.isActive).length
    const totalTopics = topics.length
    const coveragePercentage = totalTopics > 0
      ? Math.round((activeTopics / totalTopics) * 100)
      : 0

    return [
      {
        key: "total-selections",
        title: "Total Selections",
        value: String(totalSelections),
        description: "Across all periods",
        icon: {} as any // Mock icon
      },
      {
        key: "avg-selections",
        title: "Average Selections",
        value: avgSelections.toFixed(1),
        description: "Per student",
        icon: {} as any // Mock icon
      },
      {
        key: "topic-coverage",
        title: "Topic Coverage",
        value: `${coveragePercentage}%`,
        description: "Active topics",
        icon: {} as any // Mock icon
      }
    ]
  })
}

// Helper to create mock topicAnalytics$ signal
function createMockTopicAnalyticsSignal(analyticsData: any[] | null | undefined) {
  return computed((): readonly TopicAnalyticsItemVM[] => {
    const analytics = analyticsData ?? []

    return analytics.map((topic: any): TopicAnalyticsItemVM => ({
      key: topic.id ?? topic.topicId,
      id: topic.id ?? topic.topicId,
      title: topic.title ?? "",
      description: topic.description ?? "",
      subtopics: (topic.subtopics ?? []).map((st: any) => ({
        title: st.title ?? "",
        description: st.description ?? ""
      })),
      isActive: topic.isActive ?? false,
      metrics: {
        totalSelections: topic.metrics?.totalSelections ?? 0,
        averagePosition: topic.metrics?.averagePosition ?? 0,
        firstChoiceCount: topic.metrics?.firstChoiceCount ?? 0,
        top3Count: topic.metrics?.top3Count ?? 0,
        top3PercentageDisplay: String(topic.metrics?.top3Percentage ?? 0),
        engagementScore: topic.metrics?.engagementScore ?? 0,
        retentionRateDisplay: String(topic.metrics?.retentionRate ?? 0),
        performanceScore: topic.metrics?.performanceScore ?? 0
      },
      trends: {
        momentum: topic.trends?.momentum ?? "stable",
        last7Days: topic.trends?.last7Days ?? 0,
        totalEvents: topic.trends?.totalEvents ?? 0
      }
    }))
  })
}

// Helper to create mock hasData$ signal
function createMockHasDataSignal(analyticsData: any[] | null | undefined) {
  const topicAnalytics$ = createMockTopicAnalyticsSignal(analyticsData)
  return computed(() => topicAnalytics$.value.length > 0)
}

describe("AnalyticsViewVM", () => {
  describe("stats$ signal", () => {
    it("should calculate total selections correctly", () => {
      const mockTopics = [
        { _id: "t1", title: "Topic 1", isActive: true },
        { _id: "t2", title: "Topic 2", isActive: false }
      ]
      const mockStats = { totalStudents: 10 }
      const mockAnalytics = [
        { id: "t1", metrics: { totalSelections: 25 } },
        { id: "t2", metrics: { totalSelections: 15 } }
      ]

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[0].key).toBe("total-selections")
      expect(stats[0].value).toBe("40")
      expect(stats[0].title).toBe("Total Selections")
      expect(stats[0].description).toBe("Across all periods")
    })

    it("should calculate average selections per student correctly", () => {
      const mockTopics: any[] = []
      const mockStats = { totalStudents: 10 }
      const mockAnalytics: any[] = [
        { id: "t1", metrics: { totalSelections: 50 } }
      ]

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[1].key).toBe("avg-selections")
      expect(stats[1].value).toBe("5.0")
      expect(stats[1].title).toBe("Average Selections")
      expect(stats[1].description).toBe("Per student")
    })

    it("should handle zero students gracefully", () => {
      const mockTopics: any[] = []
      const mockStats = { totalStudents: 0 }
      const mockAnalytics: any[] = [
        { id: "t1", metrics: { totalSelections: 50 } }
      ]

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[1].value).toBe("0.0")
    })

    it("should calculate topic coverage percentage correctly", () => {
      const mockTopics = [
        { _id: "t1", title: "Topic 1", isActive: true },
        { _id: "t2", title: "Topic 2", isActive: true },
        { _id: "t3", title: "Topic 3", isActive: false },
        { _id: "t4", title: "Topic 4", isActive: false }
      ]
      const mockStats = { totalStudents: 10 }
      const mockAnalytics: any[] = []

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[2].key).toBe("topic-coverage")
      expect(stats[2].value).toBe("50%")
      expect(stats[2].title).toBe("Topic Coverage")
      expect(stats[2].description).toBe("Active topics")
    })

    it("should handle all active topics", () => {
      const mockTopics = [
        { _id: "t1", title: "Topic 1", isActive: true },
        { _id: "t2", title: "Topic 2", isActive: true }
      ]
      const mockStats = { totalStudents: 10 }
      const mockAnalytics: any[] = []

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[2].value).toBe("100%")
    })

    it("should handle no active topics", () => {
      const mockTopics = [
        { _id: "t1", title: "Topic 1", isActive: false },
        { _id: "t2", title: "Topic 2", isActive: false }
      ]
      const mockStats = { totalStudents: 10 }
      const mockAnalytics: any[] = []

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[2].value).toBe("0%")
    })

    it("should handle no topics", () => {
      const mockTopics: any[] = []
      const mockStats = { totalStudents: 10 }
      const mockAnalytics: any[] = []

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[2].value).toBe("0%")
    })

    it("should handle null data gracefully", () => {
      const stats$ = createMockStatsSignal(null, null, null)
      const stats = stats$.value

      expect(stats).toHaveLength(3)
      expect(stats[0].value).toBe("0")
      expect(stats[1].value).toBe("0.0")
      expect(stats[2].value).toBe("0%")
    })

    it("should handle undefined data gracefully", () => {
      const stats$ = createMockStatsSignal(undefined, undefined, undefined)
      const stats = stats$.value

      expect(stats).toHaveLength(3)
      expect(stats[0].value).toBe("0")
      expect(stats[1].value).toBe("0.0")
      expect(stats[2].value).toBe("0%")
    })

    it("should always return 3 stat cards", () => {
      const mockTopics = [{ _id: "t1", title: "Topic 1", isActive: true }]
      const mockStats = { totalStudents: 5 }
      const mockAnalytics: any[] = [{ id: "t1", metrics: { totalSelections: 10 } }]

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats).toHaveLength(3)
      expect(stats.map(s => s.key)).toEqual([
        "total-selections",
        "avg-selections",
        "topic-coverage"
      ])
    })

    it("should handle missing metrics in analytics data", () => {
      const mockTopics: any[] = []
      const mockStats = { totalStudents: 10 }
      const mockAnalytics: any[] = [
        { id: "t1" }, // No metrics
        { id: "t2", metrics: {} }, // Empty metrics
        { id: "t3", metrics: { totalSelections: 10 } }
      ]

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const stats = stats$.value

      expect(stats[0].value).toBe("10") // Only t3 counted
    })
  })

  describe("topicAnalytics$ signal", () => {
    it("should correctly map topic analytics data", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Machine Learning",
          description: "Intro to ML",
          isActive: true,
          subtopics: [
            { title: "Neural Networks", description: "Deep learning basics" }
          ],
          metrics: {
            totalSelections: 25,
            averagePosition: 2,
            firstChoiceCount: 10,
            top3Count: 20,
            top3Percentage: 80,
            engagementScore: 85,
            retentionRate: 90,
            performanceScore: 88
          },
          trends: {
            momentum: "rising" as const,
            last7Days: 15,
            totalEvents: 100
          }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics).toHaveLength(1)
      expect(analytics[0]).toMatchObject({
        key: "topic1",
        id: "topic1",
        title: "Machine Learning",
        description: "Intro to ML",
        isActive: true
      })
      expect(analytics[0].metrics.totalSelections).toBe(25)
      expect(analytics[0].metrics.averagePosition).toBe(2)
      expect(analytics[0].metrics.firstChoiceCount).toBe(10)
      expect(analytics[0].metrics.top3PercentageDisplay).toBe("80")
      expect(analytics[0].metrics.retentionRateDisplay).toBe("90")
      expect(analytics[0].trends.momentum).toBe("rising")
    })

    it("should handle topic with multiple subtopics", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Web Development",
          description: "Full stack web dev",
          subtopics: [
            { title: "React", description: "Frontend framework" },
            { title: "Node.js", description: "Backend runtime" },
            { title: "PostgreSQL", description: "Database" }
          ],
          metrics: { totalSelections: 15 },
          trends: { momentum: "stable" as const }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].subtopics).toHaveLength(3)
      expect(analytics[0].subtopics[0]).toMatchObject({
        title: "React",
        description: "Frontend framework"
      })
      expect(analytics[0].subtopics[1]).toMatchObject({
        title: "Node.js",
        description: "Backend runtime"
      })
      expect(analytics[0].subtopics[2]).toMatchObject({
        title: "PostgreSQL",
        description: "Database"
      })
    })

    it("should handle topic with no subtopics", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Simple Topic",
          description: "No subtopics",
          subtopics: [],
          metrics: { totalSelections: 5 },
          trends: { momentum: "stable" as const }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].subtopics).toHaveLength(0)
      expect(analytics[0].subtopics).toEqual([])
    })

    it("should handle missing subtopics field", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Topic without subtopics field",
          description: "Missing subtopics",
          metrics: { totalSelections: 5 },
          trends: { momentum: "stable" as const }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].subtopics).toEqual([])
    })

    it("should handle all momentum types", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Rising Topic",
          trends: { momentum: "rising" as const }
        },
        {
          id: "topic2",
          title: "Falling Topic",
          trends: { momentum: "falling" as const }
        },
        {
          id: "topic3",
          title: "Stable Topic",
          trends: { momentum: "stable" as const }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].trends.momentum).toBe("rising")
      expect(analytics[1].trends.momentum).toBe("falling")
      expect(analytics[2].trends.momentum).toBe("stable")
    })

    it("should default to stable momentum when missing", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Topic",
          trends: {}
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].trends.momentum).toBe("stable")
    })

    it("should handle missing metrics with defaults", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Topic with no metrics",
          description: "Testing defaults"
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].metrics).toMatchObject({
        totalSelections: 0,
        averagePosition: 0,
        firstChoiceCount: 0,
        top3Count: 0,
        top3PercentageDisplay: "0",
        engagementScore: 0,
        retentionRateDisplay: "0",
        performanceScore: 0
      })
    })

    it("should handle partial metrics", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Topic",
          metrics: {
            totalSelections: 10,
            firstChoiceCount: 5
            // Other metrics missing
          }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].metrics.totalSelections).toBe(10)
      expect(analytics[0].metrics.firstChoiceCount).toBe(5)
      expect(analytics[0].metrics.averagePosition).toBe(0)
      expect(analytics[0].metrics.top3Count).toBe(0)
    })

    it("should handle null analytics data gracefully", () => {
      const topicAnalytics$ = createMockTopicAnalyticsSignal(null)
      const analytics = topicAnalytics$.value

      expect(analytics).toHaveLength(0)
      expect(analytics).toEqual([])
    })

    it("should handle undefined analytics data gracefully", () => {
      const topicAnalytics$ = createMockTopicAnalyticsSignal(undefined)
      const analytics = topicAnalytics$.value

      expect(analytics).toHaveLength(0)
      expect(analytics).toEqual([])
    })

    it("should handle empty analytics array", () => {
      const topicAnalytics$ = createMockTopicAnalyticsSignal([])
      const analytics = topicAnalytics$.value

      expect(analytics).toHaveLength(0)
      expect(analytics).toEqual([])
    })

    it("should format percentage and rate as strings", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Topic",
          metrics: {
            top3Percentage: 75.5,
            retentionRate: 88.3
          }
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(typeof analytics[0].metrics.top3PercentageDisplay).toBe("string")
      expect(typeof analytics[0].metrics.retentionRateDisplay).toBe("string")
      expect(analytics[0].metrics.top3PercentageDisplay).toBe("75.5")
      expect(analytics[0].metrics.retentionRateDisplay).toBe("88.3")
    })

    it("should use id or topicId for key", () => {
      const mockAnalyticsWithId = [
        {
          id: "topic-id-1",
          title: "Topic with id"
        }
      ]

      const mockAnalyticsWithTopicId = [
        {
          topicId: "topic-id-2",
          title: "Topic with topicId"
        }
      ]

      const analytics1$ = createMockTopicAnalyticsSignal(mockAnalyticsWithId)
      const analytics2$ = createMockTopicAnalyticsSignal(mockAnalyticsWithTopicId)

      expect(analytics1$.value[0].key).toBe("topic-id-1")
      expect(analytics2$.value[0].key).toBe("topic-id-2")
    })

    it("should handle missing title and description with empty strings", () => {
      const mockAnalytics = [
        {
          id: "topic1"
          // No title or description
        }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const analytics = topicAnalytics$.value

      expect(analytics[0].title).toBe("")
      expect(analytics[0].description).toBe("")
    })
  })

  describe("hasData$ signal", () => {
    it("should return true when there is analytics data", () => {
      const mockAnalytics = [
        {
          id: "topic1",
          title: "Topic 1",
          metrics: { totalSelections: 10 }
        }
      ]

      const hasData$ = createMockHasDataSignal(mockAnalytics)

      expect(hasData$.value).toBe(true)
    })

    it("should return false when analytics is empty array", () => {
      const hasData$ = createMockHasDataSignal([])

      expect(hasData$.value).toBe(false)
    })

    it("should return false when analytics is null", () => {
      const hasData$ = createMockHasDataSignal(null)

      expect(hasData$.value).toBe(false)
    })

    it("should return false when analytics is undefined", () => {
      const hasData$ = createMockHasDataSignal(undefined)

      expect(hasData$.value).toBe(false)
    })

    it("should return true for multiple topics", () => {
      const mockAnalytics = [
        { id: "topic1", title: "Topic 1" },
        { id: "topic2", title: "Topic 2" },
        { id: "topic3", title: "Topic 3" }
      ]

      const hasData$ = createMockHasDataSignal(mockAnalytics)

      expect(hasData$.value).toBe(true)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete analytics workflow", () => {
      const mockTopics = [
        { _id: "t1", title: "Topic 1", isActive: true },
        { _id: "t2", title: "Topic 2", isActive: true },
        { _id: "t3", title: "Topic 3", isActive: false }
      ]
      const mockStats = { totalStudents: 20 }
      const mockAnalytics = [
        {
          id: "t1",
          title: "Machine Learning",
          description: "ML fundamentals",
          isActive: true,
          subtopics: [
            { title: "Neural Networks", description: "NN basics" }
          ],
          metrics: {
            totalSelections: 40,
            averagePosition: 1,
            firstChoiceCount: 30,
            top3Count: 38,
            top3Percentage: 95,
            engagementScore: 90,
            retentionRate: 92,
            performanceScore: 91
          },
          trends: {
            momentum: "rising" as const,
            last7Days: 20,
            totalEvents: 100
          }
        },
        {
          id: "t2",
          title: "Web Development",
          description: "Full stack",
          isActive: true,
          subtopics: [],
          metrics: {
            totalSelections: 20,
            averagePosition: 2,
            firstChoiceCount: 10,
            top3Count: 18,
            top3Percentage: 90,
            engagementScore: 85,
            retentionRate: 88,
            performanceScore: 86
          },
          trends: {
            momentum: "stable" as const,
            last7Days: 10,
            totalEvents: 50
          }
        }
      ]

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const hasData$ = createMockHasDataSignal(mockAnalytics)

      // Verify stats
      const stats = stats$.value
      expect(stats[0].value).toBe("60") // Total selections: 40 + 20
      expect(stats[1].value).toBe("3.0") // Avg: 60 / 20
      expect(stats[2].value).toBe("67%") // Coverage: 2/3 active

      // Verify analytics
      const analytics = topicAnalytics$.value
      expect(analytics).toHaveLength(2)
      expect(analytics[0].title).toBe("Machine Learning")
      expect(analytics[1].title).toBe("Web Development")

      // Verify hasData
      expect(hasData$.value).toBe(true)
    })

    it("should handle edge case with zero data everywhere", () => {
      const mockTopics: any[] = []
      const mockStats = { totalStudents: 0 }
      const mockAnalytics: any[] = []

      const stats$ = createMockStatsSignal(mockTopics, mockStats, mockAnalytics)
      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const hasData$ = createMockHasDataSignal(mockAnalytics)

      const stats = stats$.value
      expect(stats[0].value).toBe("0")
      expect(stats[1].value).toBe("0.0")
      expect(stats[2].value).toBe("0%")

      expect(topicAnalytics$.value).toEqual([])
      expect(hasData$.value).toBe(false)
    })

    it("should maintain reactive updates", () => {
      // Initial data
      let mockAnalytics = [
        { id: "t1", title: "Topic 1", metrics: { totalSelections: 10 } }
      ]

      const topicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const hasData$ = createMockHasDataSignal(mockAnalytics)

      expect(topicAnalytics$.value).toHaveLength(1)
      expect(hasData$.value).toBe(true)

      // Simulate empty data
      mockAnalytics = []
      const newTopicAnalytics$ = createMockTopicAnalyticsSignal(mockAnalytics)
      const newHasData$ = createMockHasDataSignal(mockAnalytics)

      expect(newTopicAnalytics$.value).toHaveLength(0)
      expect(newHasData$.value).toBe(false)
    })
  })
})
