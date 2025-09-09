"use client"

import { TopicCompetitionChart } from "@/components/charts/topic-competition-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, Users, Activity, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AnalyticsPage() {
  const trends = useQuery(api.analytics.getOverallRankingTrends, { days: 7 })
  const allMetrics = useQuery(api.rankings.getAllTopicMetrics)
  
  // Calculate summary statistics
  const totalStudents = allMetrics?.reduce((acc, m) => acc + m.studentCount, 0) || 0
  const totalTopics = allMetrics?.length || 0
  const avgStudentsPerTopic = totalTopics > 0 ? (totalStudents / totalTopics).toFixed(1) : "0"
  const mostPopular = allMetrics?.[0]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 hover:bg-primary/5 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time insights into topic preferences and student behavior
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{totalStudents}</div>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{totalTopics}</div>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Rankings/Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{avgStudentsPerTopic}</div>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Popular Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate">
                {mostPopular?.title || "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {mostPopular?.studentCount || 0} students
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Competition Chart */}
          <TopicCompetitionChart className="lg:col-span-2" />
          
          {/* Trending Topics */}
          <Card>
            <CardHeader>
              <CardTitle>Trending Topics</CardTitle>
              <CardDescription>
                Topics with recent activity in the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trends?.slice(0, 5).map((topic, index) => (
                  <div key={topic.topicId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium truncate max-w-[200px]">
                          {topic.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {topic.currentCount} students • Avg: {topic.averagePosition?.toFixed(1) || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {topic.trend === "up" && (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                      {topic.trend === "down" && (
                        <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                      )}
                      {topic.trend === "stable" && (
                        <div className="h-4 w-4 rounded-full bg-gray-300" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {topic.recentActivity} events
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Competition Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Competition Distribution</CardTitle>
              <CardDescription>
                Topics grouped by competition level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-1)" }} />
                    <span className="text-sm">Very High Competition</span>
                  </div>
                  <span className="text-sm font-medium">
                    {allMetrics?.filter(m => m.averagePosition > 0 && m.averagePosition <= 2 && m.studentCount > 5).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-2)" }} />
                    <span className="text-sm">High Competition</span>
                  </div>
                  <span className="text-sm font-medium">
                    {allMetrics?.filter(m => m.averagePosition > 2 && m.averagePosition <= 3.5 && m.studentCount > 3).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-3)" }} />
                    <span className="text-sm">Moderate Competition</span>
                  </div>
                  <span className="text-sm font-medium">
                    {allMetrics?.filter(m => m.averagePosition > 3.5 && m.averagePosition <= 5).length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: "var(--chart-4)" }} />
                    <span className="text-sm">Low Competition</span>
                  </div>
                  <span className="text-sm font-medium">
                    {allMetrics?.filter(m => m.averagePosition > 5 || m.studentCount <= 3).length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Topic Rankings Table</CardTitle>
            <CardDescription>
              All topics sorted by popularity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium p-2">Rank</th>
                    <th className="text-left font-medium p-2">Topic</th>
                    <th className="text-right font-medium p-2">Students</th>
                    <th className="text-right font-medium p-2">Avg Position</th>
                    <th className="text-right font-medium p-2">Competition</th>
                  </tr>
                </thead>
                <tbody>
                  {allMetrics?.slice(0, 10).map((metric, index) => {
                    const competition = 
                      metric.averagePosition <= 2 && metric.studentCount > 5 ? "Very High" :
                      metric.averagePosition <= 3.5 && metric.studentCount > 3 ? "High" :
                      metric.averagePosition <= 5 ? "Moderate" : "Low"
                    
                    return (
                      <tr key={metric.topicId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-medium">{metric.title}</td>
                        <td className="p-2 text-right">{metric.studentCount}</td>
                        <td className="p-2 text-right">
                          {metric.averagePosition.toFixed(1)}
                        </td>
                        <td className="p-2 text-right">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            competition === "Very High" && "bg-red-100 text-red-700",
                            competition === "High" && "bg-orange-100 text-orange-700",
                            competition === "Moderate" && "bg-yellow-100 text-yellow-700",
                            competition === "Low" && "bg-green-100 text-green-700"
                          )}>
                            {competition}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}