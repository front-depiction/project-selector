"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider"
import { ReactNode } from "react"
import { Toaster } from "sonner"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexQueryCacheProvider>
        {children}
        <Toaster />
      </ConvexQueryCacheProvider>
    </ConvexProvider>
  )
}
