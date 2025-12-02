"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface LogoutButtonProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function LogoutButton({ 
  className, 
  variant = "outline",
  size = "default"
}: LogoutButtonProps) {
  const { logout, isLoading } = useAuth0()

  return (
    <Button
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      disabled={isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Log Out
    </Button>
  )
}

