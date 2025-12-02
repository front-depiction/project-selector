"use client"

import { ReactNode, useEffect } from "react"
import { useConvexAuth } from "convex/react"
import { useAuth0 } from "@auth0/auth0-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Loader2, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginButton } from "./LoginButton"

interface AuthGuardProps {
  children: ReactNode
  /** If true, also check that user is on the allow-list */
  requireAllowList?: boolean
  /** Custom message when user is not allowed */
  notAllowedMessage?: string
  /** Show loading state while checking auth */
  showLoading?: boolean
  /** Fallback component to show when not authenticated (instead of login prompt) */
  fallback?: ReactNode
}

/**
 * Protects children from unauthenticated access.
 * Optionally also checks allow-list status.
 */
export function AuthGuard({
  children,
  requireAllowList = false,
  notAllowedMessage = "You don't have access to this content. Please contact your teacher or administrator.",
  showLoading = true,
  fallback,
}: AuthGuardProps) {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()
  const { loginWithRedirect } = useAuth0()
  
  // Store/update user in database after authentication
  const storeUser = useMutation(api.users.storeUser)
  const userStatus = useQuery(api.users.checkUserAllowed)

  // Store user on first auth
  useEffect(() => {
    if (isAuthenticated) {
      storeUser().catch(console.error)
    }
  }, [isAuthenticated, storeUser])

  // Loading state
  if (isAuthLoading || (isAuthenticated && userStatus === undefined)) {
    if (showLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    }
    return null
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <LoginButton size="lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check allow-list if required
  if (requireAllowList && userStatus && !userStatus.isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription className="mt-2">
              {notAllowedMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook to get current auth state and user info.
 */
export function useAuthState() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()
  const { user: auth0User } = useAuth0()
  const userStatus = useQuery(api.users.checkUserAllowed)
  const currentUser = useQuery(api.users.getMe)

  return {
    isLoading: isAuthLoading || (isAuthenticated && userStatus === undefined),
    isAuthenticated,
    isAllowed: userStatus?.isAllowed ?? false,
    auth0User,
    convexUser: currentUser,
  }
}

