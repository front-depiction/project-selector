"use client"

import * as React from "react"
import {
  PrerequisitesEvaluation as PrerequisitesEvaluationComponent,
  PrerequisitesEvaluationProvider,
  LoadingState
} from "@/components/PrerequisitesEvaluation/PrerequisitesEvaluation"

export default function PrerequisitesEvaluationPage() {
  // Get student ID from localStorage
  const studentId = typeof window !== "undefined" ? localStorage.getItem("studentId") || "" : ""
  
  // Redirect if no student ID - handled by provider
  if (!studentId) {
    return <LoadingState />
  }
  
  return (
    <PrerequisitesEvaluationProvider studentId={studentId}>
      <PrerequisitesEvaluationComponent />
    </PrerequisitesEvaluationProvider>
  )
}