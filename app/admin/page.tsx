"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect admin route to home - unified interface now
    router.replace("/")
  }, [router])

  return null
}
