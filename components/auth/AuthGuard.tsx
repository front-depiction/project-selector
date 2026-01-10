"use client"

import { ReactNode, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Loader2 } from "lucide-react"
import { LoginButton } from "./LoginButton"

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  loadingMessage?: string
}

/**
 * Protects routes that require teacher authentication.
 * Shows login UI if not authenticated, stores user on successful auth.
 */
export function AuthGuard({ 
  children, 
  fallback,
  loadingMessage = "Loading..."
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const storeUser = useMutation(api.users.storeUser)

  useEffect(() => {
    if (isAuthenticated) {
      storeUser().catch(console.error)
    }
  }, [isAuthenticated, storeUser])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Teacher Sign In Required</h1>
            <p className="text-muted-foreground">
              Please sign in with your teacher account to access the admin dashboard.
            </p>
          </div>
          <LoginButton size="lg" />
          <p className="text-xs text-muted-foreground">
            Students should use the{" "}
            <a href="/student" className="underline hover:text-foreground">
              Student Portal
            </a>
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
