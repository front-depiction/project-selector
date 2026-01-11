"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TopicDetails } from "@/components/analytics/TopicDetails"

interface PageProps {
  params: Promise<{ topicId: string }>
}

export default function TopicAnalyticsPage({ params }: PageProps) {
  const resolvedParams = React.use(params)
  const topicId = resolvedParams.topicId as Id<"topics">

  const topic = useQuery(api.topics.getTopic, { id: topicId })
  const analytics = useQuery(api.analytics.getTopicAnalytics, { topicId })

  if (topic === undefined || analytics === undefined) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <TopicDetails.Loading />
        </div>
      </div>
    )
  }

  if (topic === null) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin/analytics">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
          <TopicDetails.NotFound />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link href="/admin/analytics">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analytics
          </Button>
        </Link>

        <TopicDetails.Provider topic={topic} analytics={analytics}>
          <TopicDetails.Header />
          <TopicDetails.MetricsGrid />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopicDetails.TrendsChart />
            <TopicDetails.RankingDistribution />
          </div>
          <TopicDetails.StudentRankings />
        </TopicDetails.Provider>
      </div>
    </div>
  )
}