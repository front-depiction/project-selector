import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * LandingPageSkeleton Component
 *
 * Loading skeleton for the landing page.
 * Shows a structure matching the main landing page:
 * - Header with title and description
 * - Status banner area
 * - Two action cards (Student Portal, Admin Portal)
 * - Three statistics cards
 * - Analytics section with charts
 */
export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        {/* Header Skeleton */}
        <div className="text-center mb-12 space-y-4">
          <Skeleton className="h-10 w-96 mx-auto" />
          <Skeleton className="h-6 w-[500px] mx-auto" />
        </div>

        {/* Status Banner Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
        </div>

        {/* Action Cards Skeleton */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-8 w-8 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-64 mb-4" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-20 mb-2" />
                <Skeleton className="h-3 w-40" />
                {i === 2 && <Skeleton className="h-2 w-full mt-3 rounded-full" />}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analytics Section Skeleton */}
        <div className="space-y-8 mb-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-5 w-80 mx-auto" />
          </div>
          <div className="flex flex-col gap-6">
            {/* Chart Skeletons */}
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-12 text-center space-y-2">
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-3 w-96 mx-auto" />
        </div>
      </div>
    </div>
  )
}
