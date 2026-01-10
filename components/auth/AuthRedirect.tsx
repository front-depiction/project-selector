"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useConvexAuth } from "convex/react"

/**
 * Redirects authenticated users to /admin if they're on the home page.
 * This ensures teachers go straight to the dashboard after login.
 */
export function AuthRedirect() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect if authenticated, not loading, and on home page
    if (!isLoading && isAuthenticated && pathname === "/") {
      router.push("/admin")
    }
  }, [isAuthenticated, isLoading, pathname, router])

  return null
}
