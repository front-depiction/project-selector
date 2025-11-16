"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { signOut } = useAuthActions();

  return (
    <Button
      onClick={() => void signOut()}
      variant="destructive"
    >
      Sign Out
    </Button>
  );
}

