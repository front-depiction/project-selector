"use client"

import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";
import { ReactNode } from "react"
import { Toaster } from "sonner"
import { AuthSync } from "@/components/auth/AuthSync"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <ConvexQueryCacheProvider>
        <AuthSync />
        {children}
        <Toaster />
      </ConvexQueryCacheProvider>
    </ConvexAuthProvider>
  )
}
