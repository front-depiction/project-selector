"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { StudentIdForm } from "@/components/auth/StudentIdForm"
import { redirect } from "next/navigation"

export default function StudentEntryPage() {
  const { user, isLoaded } = useUser()
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkUserId: user.id } : "skip"
  )

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-primary/20 rounded"></div>
          <div className="h-4 w-32 bg-primary/20 rounded"></div>
        </div>
      </div>
    )
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    redirect("/sign-in")
  }

  // Show student ID form if user doesn't have student ID
  if (currentUser && !currentUser.studentId) {
    return <StudentIdForm />
  }

  // Redirect to selection page if user has student ID
  if (currentUser?.studentId) {
    redirect("/student/select")
  }

  // Loading state while user data is being fetched
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-48 bg-primary/20 rounded"></div>
        <div className="h-4 w-32 bg-primary/20 rounded"></div>
      </div>
    </div>
  )
}