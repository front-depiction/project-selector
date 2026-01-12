"use client"

import { ConvexReactClient } from "convex/react"
import { ConvexProviderWithAuth0 } from "convex/react-auth0"
import { Auth0Provider } from "@auth0/auth0-react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider"
import { ReactNode } from "react"
import { Toaster } from "sonner"

const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? ""
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? ""
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? ""

// Always create a Convex client, even if URL is empty (for build time)
// Use a placeholder URL if none is provided to prevent build errors
const convex = new ConvexReactClient(CONVEX_URL || "https://placeholder.convex.cloud")

export function Providers({ children }: { children: ReactNode }) {
  // If Auth0 is not configured, fall back to basic provider (for development)
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    console.warn(
      "Auth0 not configured. Set NEXT_PUBLIC_AUTH0_DOMAIN and NEXT_PUBLIC_AUTH0_CLIENT_ID in .env.local"
    )
    // Import dynamically to avoid issues
    const { ConvexProvider } = require("convex/react")
    return (
      <ConvexProvider client={convex}>
        <ConvexQueryCacheProvider>
          {children}
          <Toaster />
        </ConvexQueryCacheProvider>
      </ConvexProvider>
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
      onRedirectCallback={(appState) => {
        // After login, redirect to admin dashboard
        // The appState.returnTo is set by LoginButton
        if (typeof window !== "undefined" && appState?.returnTo) {
          window.location.href = appState.returnTo
        } else if (typeof window !== "undefined") {
          // Default to admin if no returnTo specified
          window.location.href = "/admin"
        }
      }}
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
