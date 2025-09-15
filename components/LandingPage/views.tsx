"use client"

import * as React from "react"
import * as LP from "./LandingPage"
import { Separator } from "@/components/ui/separator"
import { Id } from "@/convex/_generated/dataModel"

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

  // Handle assigned period
  if (currentPeriod.status === "assigned" && !studentId) {
    return <AllAssignmentsView periodId={currentPeriod._id} />
  }
  if (currentPeriod.status === "assigned" && studentId && myAssignment === undefined) {
    return <LP.LoadingAssignment studentId={studentId} />
  }
  if (currentPeriod.status === "assigned" && studentId && myAssignment) {
    return <PersonalAssignmentView />
  }
  if (currentPeriod.status === "assigned" && studentId && !myAssignment) {
    return <LP.NoAssignmentFound studentId={studentId} />
  }

  // Handle open period
  if (currentPeriod.status === "open") {
    return <SelectionView />
  }

  // Default: no active period
  return <InactivePeriodView />
}

// ============================================================================
// ROOT COMPONENT WITH PROVIDER
// ============================================================================

export const LandingPage: React.FC = () => (
  <LP.Provider>
    <LandingPageContent />
  </LP.Provider>
)