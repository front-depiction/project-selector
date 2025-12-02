"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

interface LoginButtonProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function LoginButton({ 
  className, 
  variant = "default",
  size = "default"
}: LoginButtonProps) {
  const { loginWithRedirect, isLoading } = useAuth0()

  return (
    <Button
      onClick={() => loginWithRedirect()}
      disabled={isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      <LogIn className="mr-2 h-4 w-4" />
      Log In
    </Button>
  )
}

