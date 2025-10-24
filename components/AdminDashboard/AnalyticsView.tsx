"use client"

import * as React from "react"
import * as AD from "./index"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react"
import TopicAnalyticsCard from "@/components/analytics/TopicAnalyticsCard"

export const AnalyticsView: React.FC = () => {
  const { topics, stats, topicAnalytics } = AD.useDashboard()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Selections</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSelections || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all periods
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Selections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageSelectionsPerStudent?.toFixed(1) || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Per student
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topic Coverage</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topics ? `${Math.round((topics.filter(t => t.isActive).length / topics.length) * 100)}%` : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              Active topics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Topic Analytics */}
      {topicAnalytics && topicAnalytics.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {topicAnalytics.map((analytics: any) => (
            <TopicAnalyticsCard
              key={analytics.topicId || analytics.id}
              topic={analytics}
            />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>
                  View detailed analytics about topic selections and student preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Analytics will appear here once students start making selections.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}