import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Trophy,
  Target,
  Percent,
  Layers,
  ChevronRight
} from "lucide-react"

interface TopicAnalyticsCardProps {
  topic: {
    id: string
    title: string
    description: string
    subtopics: any[]
    isActive: boolean
    metrics: {
      totalSelections: number
      averagePosition: number
      firstChoiceCount: number
      top3Count: number
      top3Percentage: number
      engagementScore: number
      retentionRate: number
      performanceScore: number
    }
    trends: {
      momentum: "rising" | "falling" | "stable"
      last7Days: number
      totalEvents: number
    }
  }
}

export default function TopicAnalyticsCard({ topic }: TopicAnalyticsCardProps) {
  const getMomentumColor = (momentum: string) => {
    switch (momentum) {
      case "rising": return "text-green-500"
      case "falling": return "text-red-500"
      default: return "text-gray-500"
    }
  }

  const getMomentumIcon = (momentum: string) => {
    switch (momentum) {
      case "rising": return <TrendingUp className="h-4 w-4" />
      case "falling": return <TrendingDown className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "bg-green-500" }
    if (score >= 60) return { label: "Good", color: "bg-blue-500" }
    if (score >= 40) return { label: "Average", color: "bg-yellow-500" }
    return { label: "Low", color: "bg-gray-500" }
  }

  const performance = getPerformanceLevel(topic.metrics.performanceScore)

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`h-1 ${performance.color}`} />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{topic.title}</CardTitle>
            <CardDescription className="text-sm">{topic.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getMomentumColor(topic.trends.momentum)} border-current`}>
              {getMomentumIcon(topic.trends.momentum)}
              <span className="ml-1 capitalize">{topic.trends.momentum}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-bold">{topic.metrics.totalSelections}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Target className="h-3 w-3" />
              <span className="text-xs">Avg Rank</span>
            </div>
            <p className="text-2xl font-bold">#{topic.metrics.averagePosition}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="h-3 w-3" />
              <span className="text-xs">1st Choice</span>
            </div>
            <p className="text-2xl font-bold">{topic.metrics.firstChoiceCount}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Percent className="h-3 w-3" />
              <span className="text-xs">Top 3</span>
            </div>
            <p className="text-2xl font-bold">{topic.metrics.top3Percentage}%</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Performance Score</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{topic.metrics.performanceScore}</span>
                <Badge variant="secondary" className="text-xs">
                  {performance.label}
                </Badge>
              </div>
            </div>
            <Progress value={Math.min(100, topic.metrics.performanceScore)} className="h-2" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Retention Rate</span>
              <span className="text-sm font-bold">{topic.metrics.retentionRate}%</span>
            </div>
            <Progress value={topic.metrics.retentionRate} className="h-2" />
          </div>
        </div>

        {/* Subtopics */}
        {topic.subtopics && topic.subtopics.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Subtopics ({topic.subtopics.length})</span>
            </div>
            <div className="space-y-2">
              {topic.subtopics.slice(0, 3).map((subtopic, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{subtopic.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{subtopic.description}</p>
                  </div>
                </div>
              ))}
              {topic.subtopics.length > 3 && (
                <p className="text-xs text-muted-foreground pl-3.5">
                  +{topic.subtopics.length - 3} more subtopics
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Link href={`/admin/analytics/${topic.id}`} className="block">
          <Button variant="outline" className="w-full">
            View Detailed Analytics
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}