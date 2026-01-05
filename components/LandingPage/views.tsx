"use client"

import * as React from "react"
import * as LP from "./LandingPage"
import { Separator } from "@/components/ui/separator"
import { Id } from "@/convex/_generated/dataModel"
import * as SelectionPeriod from "@/convex/schemas/SelectionPeriod"

// ============================================================================
// COMPOSED VIEWS - Built from atomic components
// ============================================================================

export const InactivePeriodView: React.FC = () => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        No active selection period at this time
      </LP.HeaderDescription>
    </LP.Header>
    <LP.InactivePeriodCard />
    <LP.Footer />
  </LP.Frame>
)

export const SelectionView: React.FC = () => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        Choose your preferred project topics with real-time congestion feedback
        to maximize your chances of getting your top choices.
      </LP.HeaderDescription>
    </LP.Header>
    <LP.StatusBanner />
    <LP.ActionCards />
    <Separator className="my-8" />
    <LP.StatisticsCards />
    <LP.AnalyticsSection />
    <LP.FooterWithTagline />
  </LP.Frame>
)

export const PersonalAssignmentView: React.FC = () => {
  const { myAssignment } = LP.useLandingPage()
  const topic = myAssignment?.topic

  if (!topic) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LP.PersonalAssignmentDisplay />
    </div>
  )
}

export const AllAssignmentsView: React.FC<{ periodId: Id<"selectionPeriods"> }> = ({ periodId }) => (
  <LP.Frame>
    <LP.Header>
      <LP.HeaderDescription>
        Topics have been assigned to all students
      </LP.HeaderDescription>
    </LP.Header>
    <LP.AllAssignmentsDisplay periodId={periodId} />
    <LP.Footer />
  </LP.Frame>
)

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

export const LandingPageContent: React.FC = () => {
  const { stats, currentPeriod, studentId, myAssignment } = LP.useLandingPage()

  // Loading state
  if (stats === undefined || currentPeriod === undefined) {
    return <LP.LoadingState />
  }

  // No active period
  if (currentPeriod === null) {
    return <InactivePeriodView />
  }

  // Use pattern matching for different period states
  return SelectionPeriod.match(currentPeriod)({
    inactive: () => <InactivePeriodView />,

    open: () => <SelectionView />,

    closed: () => <InactivePeriodView />,

    assigned: (period) => {
      if (!studentId)
        return <AllAssignmentsView periodId={period._id} />

      switch (myAssignment) {
        case undefined:
          return <LP.LoadingAssignment studentId={studentId} />
        case null:
          return <AllAssignmentsView periodId={period._id} />
        default:
          return <PersonalAssignmentView />
      }
    }
  })
}

// ============================================================================
// ROOT COMPONENT WITH PROVIDER
// ============================================================================

export const LandingPage: React.FC = () => (
  <LP.Provider>
    <LandingPageContent />
  </LP.Provider>
)