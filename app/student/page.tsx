"use client"

import { StudentEntry } from "@/components/StudentEntry/views"
import { AuthGuard } from "@/components/auth"

export default function StudentEntryPage() {
  return (
    <AuthGuard>
      <StudentEntry />
    </AuthGuard>
  )
}