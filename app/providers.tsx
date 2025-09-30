"use client"

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider"
import { useAuth } from "@clerk/nextjs"
import { ReactNode } from "react"
import { Toaster } from "sonner"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()
  
  return (
    <ConvexProviderWithAuth 
      client={convex}
      useAuth={() => ({
        isLoading: false,
        isAuthenticated: !!getToken,
        fetchAccessToken: async () => {
          const token = await getToken({ template: "convex" })
          return token
        }
      })}
    >
      <ConvexQueryCacheProvider>
        {children}
        <Toaster />
      </ConvexQueryCacheProvider>
    </ConvexProviderWithAuth>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      {children}
    </ConvexClientProvider>
  )
}
