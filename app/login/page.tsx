"use client";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/50">
      <div className="w-full max-w-md">
        <LoginForm />
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Secured by Convex Auth
        </div>
      </div>
    </div>
  );
}

