"use client"

import { AdminDashboard } from "@/components/AdminDashboard/views"
import { AuthGuard } from "@/components/auth"

export default function DashboardPage() {
  return (
    <AuthGuard 
      requireAllowList={true}
      notAllowedMessage="You don't have admin access. Please contact an administrator to request access."
    >
      <AdminDashboard />
    </AuthGuard>
  )
}

