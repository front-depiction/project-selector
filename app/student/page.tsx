"use client"

import React from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { StudentIdForm } from "@/components/auth/StudentIdForm"
import { redirect } from "next/navigation"
import Link from "next/link"

export default function StudentEntryPage() {
  const { user, isLoaded } = useUser()
  const userId = user?.id
  const userEmail = user?.emailAddresses[0]?.emailAddress
  
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkUserId: userId } : "skip"
  )
  const createUser = useMutation(api.users.getOrCreateUser)

  const [isCreatingUser, setIsCreatingUser] = React.useState(false)
  const [showError, setShowError] = React.useState(false)
  const [creationError, setCreationError] = React.useState<string | null>(null)
  
  // Show error after timeout if data isn't loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowError(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  // Create user in Convex if they don't exist (data sync with external system)
  React.useEffect(() => {
    if (!userId || !userEmail || currentUser !== null || isCreatingUser) return
    
    console.log("Creating user in Convex database...")
    setIsCreatingUser(true)
    createUser({
      clerkUserId: userId,
      email: userEmail,
      firstName: user?.firstName || undefined,
      lastName: user?.lastName || undefined,
    })
    .then(() => {
      console.log("User created successfully")
      setIsCreatingUser(false)
    })
    .catch((error) => {
      console.error("Failed to create user:", error)
      setCreationError(error instanceof Error ? error.message : "Failed to create user")
      setIsCreatingUser(false)
    })
  }, [userId, userEmail, currentUser, isCreatingUser, createUser, user?.firstName, user?.lastName])

  // Debug logging
  console.log("StudentEntryPage Debug:", {
    isLoaded,
    userId,
    userEmail,
    currentUser,
    hasStudentId: currentUser?.studentId,
  })

  // Loading state
  if (!isLoaded || currentUser === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-primary/20 rounded"></div>
          <div className="h-4 w-32 bg-primary/20 rounded"></div>
          <div className="text-sm text-muted-foreground">Loading authentication...</div>
        </div>
      </div>
    )
  }

  // Not authenticated - show link to sign in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold">Please sign in to continue</div>
          <Link 
            href="/sign-in" 
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  // User has studentId - redirect to select
  if (currentUser?.studentId) {
    console.log("User has student ID, redirecting to select")
    // Store studentId in localStorage for consistency (external system sync)
    if (typeof window !== 'undefined') {
      localStorage.setItem("studentId", currentUser.studentId)
    }
    redirect("/student/select")
  }

  // Creating user
  if (isCreatingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-48 bg-primary/20 rounded"></div>
          <div className="h-4 w-32 bg-primary/20 rounded"></div>
          <div className="text-sm text-muted-foreground">Creating user account...</div>
        </div>
      </div>
    )
  }

  // Creation error
  if (creationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500">Error creating user account</div>
          <div className="text-sm text-muted-foreground">{creationError}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show error after timeout
  if (showError && currentUser === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500">Error loading user data</div>
          <div className="text-sm text-muted-foreground">
            Check console for details. Make sure CLERK_JWT_ISSUER_DOMAIN is set in Convex dashboard.
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show student ID form if user exists but doesn't have student ID
  if (currentUser && !currentUser.studentId) {
    console.log("User has no student ID, showing form")
    return <StudentIdForm />
  }

  // Default loading state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-48 bg-primary/20 rounded"></div>
        <div className="h-4 w-32 bg-primary/20 rounded"></div>
        <div className="text-sm text-muted-foreground">Loading user data...</div>
      </div>
    </div>
  )
}