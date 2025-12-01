import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * StudentSelectionSkeleton Component
 *
 * Loading skeleton for the student topic selection page.
 * Shows a structure matching the selection interface:
 * - Back button and header
 * - Period info card
 * - Three quick stats cards
 * - Ranking header with progress
 * - Multiple topic cards
 * - Help section cards
 */
export function StudentSelectionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        {/* Back Button Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-9 w-32 mb-4 rounded-md" />

          {/* Period Info Card Skeleton */}
          <Card className="mb-6 border-primary/10 shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-7 w-64" />
                  </div>
                  <Skeleton className="h-5 w-96" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-1" />
                <Skeleton className="h-4 w-28" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ranking Section Skeleton */}
        <div className="mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-20 rounded-full" />
              </div>
            </div>
          </div>

          {/* Topic Cards Skeleton */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border shadow-sm">
                <div className="flex items-center w-full p-4">
                  {/* Order Badge */}
                  <div className="flex items-center gap-3 w-16 flex-shrink-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0 px-4 space-y-2">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-96" />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 w-56 flex-shrink-0 justify-end">
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Help Section Skeleton */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
