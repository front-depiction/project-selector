"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStudentSelectionPageVM } from "@/components/StudentSelection/StudentSelectionPageVM"
import { StudentSelectionPage } from "@/components/StudentSelection/StudentSelectionPage"

/**
 * Student Selection Page Route
 *
 * This page component is a thin wrapper that:
 * 1. Creates the ViewModel using the hook
 * 2. Handles redirect logic when no student ID is present
 * 3. Renders the view component with the ViewModel
 *
 * All business logic is contained in the ViewModel.
 */
export default function SelectTopics() {
  const router = useRouter()
  const vm = useStudentSelectionPageVM()

  // Redirect if no student ID (side effect in page component)
  useEffect(() => {
    if (!vm.studentId$.value) {
      router.push("/student")
    }
  }, [vm.studentId$.value, router])

  return <StudentSelectionPage vm={vm} />
}
