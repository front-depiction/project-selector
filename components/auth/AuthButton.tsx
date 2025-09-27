"use client"

import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { User, LogOut, LogIn } from "lucide-react"

export function AuthButton() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <Button variant="ghost" disabled>
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {user.firstName || user.emailAddresses[0]?.emailAddress}
        </span>
        <SignOutButton>
          <Button variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </SignOutButton>
      </div>
    )
  }

  return (
    <SignInButton>
      <Button variant="default" size="sm">
        <LogIn className="w-4 h-4 mr-2" />
        Sign In
      </Button>
    </SignInButton>
  )
}

