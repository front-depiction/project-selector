"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { LucideIcon } from "lucide-react"
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react"

// ============================================================================
// View Model Types
// ============================================================================

export interface StatCardVM {
  readonly key: string
  readonly title: string
  readonly value: string
  readonly description: string
  readonly icon: LucideIcon
}

export interface SubtopicVM {
  readonly title: string
  readonly description: string
}

export interface TopicAnalyticsItemVM {
  readonly key: string
  readonly id: string
  readonly title: string
  readonly description: string
  readonly subtopics: readonly SubtopicVM[]
  readonly isActive: boolean
  readonly metrics: {
    readonly totalSelections: number
    readonly averagePosition: number
    readonly firstChoiceCount: number
    readonly top3Count: number
    readonly top3PercentageDisplay: string
    readonly engagementScore: number
    readonly retentionRateDisplay: string
    readonly performanceScore: number
  }
  readonly trends: {
    readonly momentum: "rising" | "falling" | "stable"
    readonly last7Days: number
    readonly totalEvents: number
  }
}

export interface AnalyticsViewVM {
  readonly stats$: ReadonlySignal<readonly StatCardVM[]>
  readonly topicAnalytics$: ReadonlySignal<readonly TopicAnalyticsItemVM[]>
  readonly hasData$: ReadonlySignal<boolean>
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useAnalyticsViewVM(): AnalyticsViewVM {
  // Convex queries - already reactive!
  const topicsData = useQuery(api.topics.getAllTopics, {})
  const statsData = useQuery(api.stats.getLandingStats)
  const topicAnalyticsData = useQuery(api.topicAnalytics.getTopicPerformanceAnalytics, {})

  // Computed: stats cards
  const stats$ = computed((): readonly StatCardVM[] => {
    const topics = topicsData ?? []
    const stats = statsData
    const analytics = topicAnalyticsData ?? []

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
        icon: TrendingUp
      },
      {
        key: "avg-selections",
        title: "Average Selections",
        value: avgSelections.toFixed(1),
        description: "Per student",
        icon: Users
      },
      {
        key: "topic-coverage",
        title: "Topic Coverage",
        value: `${coveragePercentage}%`,
        description: "Active topics",
        icon: FileText
      }
    ]
  })

  // Computed: topic analytics with pre-formatted data
  const topicAnalytics$ = computed((): readonly TopicAnalyticsItemVM[] => {
    const analytics = topicAnalyticsData ?? []

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

  // Computed: whether there's data to display
  const hasData$ = computed(() => topicAnalytics$.value.length > 0)

  return {
    stats$,
    topicAnalytics$,
    hasData$
  }
}
