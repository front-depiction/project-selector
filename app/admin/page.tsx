"use client"

import { AdminDashboard } from "@/components/AdminDashboard/views"
import { AuthGuard } from "@/components/auth"

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  )
}