"use client"

import React from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { StudentIdForm } from "@/components/auth/StudentIdForm"
import { useRouter } from "next/navigation"

export default function StudentEntryPage() {
  const { user, isLoaded } = useUser()
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkUserId: user.id } : "skip"
  )
  const createUser = useMutation(api.users.getOrCreateUser)
  const router = useRouter()

  // All hooks must be at the top - no conditional hooks!
  const [showError, setShowError] = React.useState(false)
  const [isCreatingUser, setIsCreatingUser] = React.useState(false)
  const [hasRedirected, setHasRedirected] = React.useState(false)
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowError(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  // Create user in Convex if they don't exist
  React.useEffect(() => {
    if (user && currentUser === null && !isCreatingUser) {
      console.log("Creating user in Convex database...")
      setIsCreatingUser(true)
      createUser({
        clerkUserId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      })
      .then(() => {
        console.log("User created successfully")
        setIsCreatingUser(false)
      })
      .catch((error) => {
        console.error("Failed to create user:", error)
        setIsCreatingUser(false)
      })
    }
  }, [user, currentUser, isCreatingUser, createUser])

  // Handle redirects in useEffect to avoid hook order issues
  React.useEffect(() => {
    if (isLoaded && !user && !hasRedirected) {
      console.log("No user, redirecting to sign-in")
      setHasRedirected(true)
      router.push("/sign-in")
    }
  }, [isLoaded, user, router, hasRedirected])

  React.useEffect(() => {
    if (currentUser?.studentId && !hasRedirected) {
      console.log("User has student ID, redirecting to select")
      // Store studentId in localStorage for consistency
      localStorage.setItem("studentId", currentUser.studentId)
      setHasRedirected(true)
      router.push("/student/select")
    }
  }, [currentUser?.studentId, router, hasRedirected])

  // Debug logging
  console.log("StudentEntryPage Debug:", {
    isLoaded,
    user: user ? { id: user.id, email: user.emailAddresses[0]?.emailAddress } : null,
    currentUser,
    hasStudentId: currentUser?.studentId,
    hasRedirected
  })

  // Show loading while auth is loading
  if (!isLoaded) {
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

  // Show student ID form if user doesn't have student ID
  if (currentUser && !currentUser.studentId && !hasRedirected) {
    console.log("User has no student ID, showing form")
    return <StudentIdForm />
  }

  // Show creating user state
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

  if (showError && !hasRedirected) {
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