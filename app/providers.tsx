"use client"

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider"
import { ClerkProvider, useAuth } from "@clerk/nextjs"
import { ReactNode } from "react"
import { Toaster } from "sonner"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()

  return (
    <ConvexProviderWithClerk
      client={convex}
      useAuth={useAuth}
    >
      <ConvexQueryCacheProvider>
        {children}
        <Toaster />
      </ConvexQueryCacheProvider>
    </ConvexProviderWithClerk>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexClientProvider>
        {children}
      </ConvexClientProvider>
    </ClerkProvider>
  )
}
