"use client"

import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithAuth0 } from "convex/react-auth0"
import { Auth0Provider } from "@auth0/auth0-react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider"
import { ReactNode, useEffect } from "react"
import { Toaster } from "sonner"

// Auth0 configuration - ensure these are set in .env.local
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? ""
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? ""
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? ""

const convex = new ConvexReactClient(CONVEX_URL)

export function Providers({ children }: { children: ReactNode }) {
  // Debug: log auth config on mount (remove in production)
  useEffect(() => {
    console.log("Auth0 Config:", {
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID ? AUTH0_CLIENT_ID.substring(0, 8) + "..." : "NOT SET",
      convexUrl: CONVEX_URL,
    })
  }, [])

  // Validate config
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    console.error("Missing Auth0 configuration. Check your .env.local file.")
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Configuration Error</h1>
          <p className="text-muted-foreground mb-4">
            Auth0 environment variables are not set.
          </p>
          <pre className="text-left bg-muted p-4 rounded text-sm">
            {`NEXT_PUBLIC_AUTH0_DOMAIN=${AUTH0_DOMAIN || "NOT SET"}
NEXT_PUBLIC_AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID ? "SET" : "NOT SET"}`}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Add these to your .env.local file and restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <ConvexProviderWithAuth0 client={convex}>
        <ConvexQueryCacheProvider>
          {children}
          <Toaster />
        </ConvexQueryCacheProvider>
      </ConvexProviderWithAuth0>
    </Auth0Provider>
  )
}
