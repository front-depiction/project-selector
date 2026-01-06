"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TopicAnalyticsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home - unified interface now
    router.replace("/")
  }, [router])

  return null
}
