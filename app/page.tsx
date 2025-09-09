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
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"

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

export default function LandingPage() {
  const stats = useQuery(api.stats.getLandingStats)

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

        {/* Action Buttons */}
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

        {/* Statistics */}
        {stats.isActive && (
          <>
            <Separator className="my-8" />
            
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

            {/* Popular Topics */}
            <div className="grid md:grid-cols-2 gap-8">
              {stats.mostPopularTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Most Popular Topics
                    </CardTitle>
                    <CardDescription>Highest congestion risk</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.mostPopularTopics.map((topic, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate flex-1">
                            {index + 1}. {topic.title}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {topic.count} students
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stats.leastPopularTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-blue-500" />
                      Least Popular Topics
                    </CardTitle>
                    <CardDescription>Best chance of selection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.leastPopularTopics.map((topic, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate flex-1">
                            {index + 1}. {topic.title}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {topic.count} students
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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