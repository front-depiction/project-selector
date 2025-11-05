"use client"

import React from "react"
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { StudentIdForm } from "@/components/auth/StudentIdForm"
import { redirect } from "next/navigation"
import { Student } from "@/components/student"

function AuthenticatedContent() {
  const currentUser = useQuery(api.users.getCurrentUser)

  if (currentUser === undefined) {
    return <Student.Loading message="Loading user data..." />
  }

  if (currentUser === null) {
    return (
      <Student.ErrorMessage
        title="Authentication Error"
        message="Unable to load user data. Please try signing out and back in."
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (currentUser.studentId) {
    if (typeof window !== 'undefined') {
      // will be removed
      localStorage.setItem("studentId", currentUser.studentId)
    }
    redirect("/student/select")
  }

  return <StudentIdForm />
}

export default function StudentEntryPage() {
  return (
    <Student.PageLayout>
      <AuthLoading>
        <Student.Loading message="Loading authentication..." />
      </AuthLoading>

      <Unauthenticated>
        <Student.Unauthenticated />
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
    </Student.PageLayout>
  )
}