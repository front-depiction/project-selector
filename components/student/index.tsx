"use client"

import React from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingProps {
  message?: string
  className?: string
}

const Loading = ({ message = "Loading...", className }: LoadingProps) => (
  <div className={cn("space-y-4", className)}>
    <Skeleton className="h-12 w-48" />
    <Skeleton className="h-4 w-32" />
    {message && (
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    )}
  </div>
)

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

const ErrorMessage = ({
  title = "Error",
  message,
  onRetry,
  className,
}: ErrorMessageProps) => (
  <div className={cn("text-center space-y-4", className)}>
    <div className="text-red-500 font-semibold">{title}</div>
    <div className="text-sm text-muted-foreground">{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
)

interface UnauthenticatedProps {
  message?: string
  signInPath?: string
  className?: string
}

const Unauthenticated = ({
  message = "Please sign in to continue",
  signInPath = "/sign-in",
  className,
}: UnauthenticatedProps) => (
  <div className={cn("text-center space-y-4", className)}>
    <div className="text-xl font-semibold">{message}</div>
    <Link
      href={signInPath}
      className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
    >
      Go to Sign In
    </Link>
  </div>
)

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

const PageLayout = ({ children, className }: PageLayoutProps) => (
  <div
    className={cn(
      "min-h-screen bg-background flex items-center justify-center",
      className
    )}
  >
    {children}
  </div>
)

export const Student = {
  Loading,
  ErrorMessage,
  Unauthenticated,
  PageLayout,
}