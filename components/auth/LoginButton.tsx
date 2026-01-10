"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { Button } from "@/components/ui/button"
import { LogIn, Loader2 } from "lucide-react"

interface LoginButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  returnTo?: string
}

export function LoginButton({ 
  className, 
  variant = "default",
  size = "default",
  returnTo = "/admin"
}: LoginButtonProps) {
  const { loginWithRedirect, isLoading } = useAuth0()

  const handleLogin = () => {
    loginWithRedirect({
      appState: {
        returnTo: returnTo || "/admin"
      }
    })
  }

  return (
    <Button 
      onClick={handleLogin} 
      disabled={isLoading} 
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      Log In
    </Button>
  )
}
