"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import TopicAnalyticsCard from "@/components/analytics/TopicAnalyticsCard"
import { useAnalyticsViewVM } from "./AnalyticsViewVM"

export const AnalyticsView: React.FC = () => {
  const vm = useAnalyticsViewVM()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vm.stats$.value.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.key} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Topic Analytics */}
      {vm.hasData$.value ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vm.topicAnalytics$.value.map((analytics) => (
            <TopicAnalyticsCard
              key={analytics.key}
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