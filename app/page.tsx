"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  Users,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import { RankingEventsChart } from "@/components/charts/ranking-events-chart"
import { TopicCompetitionMixedChart } from "@/components/charts/topic-competition-mixed"

// Pure function to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case "open": return "bg-green-500"
    case "upcoming": return "bg-blue-500"
    case "closed": return "bg-red-500"
    default: return "bg-gray-500"
  }
}

// Pure function to get status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "open": return <CheckCircle className="h-4 w-4" />
    case "upcoming": return <Clock className="h-4 w-4" />
    case "closed": return <XCircle className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

// Pure function to format status text
const getStatusText = (status: string): string => {
  switch (status) {
    case "open": return "Selection Open"
    case "upcoming": return "Opening Soon"
    case "closed": return "Selection Closed"
    default: return "No Active Period"
  }
}

function StatusBanner({ stats }: { stats: any }) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(stats.periodStatus)}
            <CardTitle>{getStatusText(stats.periodStatus)}</CardTitle>
          </div>
          <Badge className={getStatusColor(stats.periodStatus)}>
            {stats.periodStatus.toUpperCase()}
          </Badge>
        </div>
        {stats.isActive && stats.openDate && stats.closeDate && (
          <CardDescription className="mt-2">
            {stats.periodStatus === "open" && (
              <>Closes {formatDistanceToNow(new Date(stats.closeDate), { addSuffix: true })}</>
            )}
            {stats.periodStatus === "upcoming" && (
              <>Opens {formatDistanceToNow(new Date(stats.openDate), { addSuffix: true })}</>
            )}
            {stats.periodStatus === "closed" && (
              <>Closed {format(new Date(stats.closeDate), "PPP")}</>
            )}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  )
}

function ActionButtons() {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Link href="/student">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Student Portal</CardTitle>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Select and rank your preferred project topics
            </p>
            <Button className="w-full" size="lg">
              Enter Selection <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Link>
      </Card>

      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Link href="/admin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage topics and view selection statistics
            </p>
            <Button className="w-full" size="lg">
              Admin Access <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Link>
      </Card>
    </div>
  )
}

function Statistics({ stats, progressPercentage }: { stats: any, progressPercentage: number }) {
  return (
    <div className="grid md:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTopics}</div>
          <p className="text-xs text-muted-foreground">Available projects</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Students Participated</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalStudents}</div>
          <p className="text-xs text-muted-foreground">
            Avg {stats.averageSelectionsPerStudent.toFixed(1)} selections each
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Selection Progress</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSelections}</div>
          <p className="text-xs text-muted-foreground">Total selections made</p>
          <Progress value={progressPercentage} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsCharts({ competitionData }: { competitionData: any }) {
  return (
    <div className="space-y-8 mb-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Live Analytics</h2>
        <p className="text-muted-foreground">Real-time insights into the selection process</p>
      </div>
      {/* Stack charts vertically instead of horizontally */}
      <div className="flex flex-col gap-6">
        {/* Selection Activity Chart */}
        <RankingEventsChart granularity="hourly" hours={48} />

        {/* Competition Levels Chart */}
        {competitionData && competitionData.length > 0 && (
          <TopicCompetitionMixedChart className="h-full" />
        )}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const stats = useQuery(api.stats.getLandingStats)
  const competitionData = useQuery(api.analytics.getTopicCompetitionLevels)
  // overallTrends is unused in this file, so omitting for clarity

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const progressPercentage = stats.totalTopics > 0
    ? (stats.totalStudents / (stats.totalTopics * 5)) * 100
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Project Topic Selection System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your preferred project topics with real-time congestion feedback
            to maximize your chances of getting your top choices.
          </p>
        </div>

        {/* Status Banner */}
        <StatusBanner stats={stats} />

        {/* Action Buttons */}
        <ActionButtons />

        {/* Statistics */}
        {stats.isActive && (
          <>
            <Separator className="my-8" />
            <Statistics stats={stats} progressPercentage={progressPercentage} />
            <AnalyticsCharts competitionData={competitionData} />
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>University Project Topic Selection System</p>
          <p className="mt-2">
            Built with real-time congestion awareness to minimize disappointment
          </p>
        </div>
      </div>
    </div>
  )
}