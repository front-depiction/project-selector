"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default function AuthTestPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
          <CardDescription>
            Quick page to test the authentication flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Current Status:</h3>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && isAuthenticated && (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">✅ Authenticated</p>
                <p className="text-sm">Student ID: {user?.studentId}</p>
                <p className="text-sm">Email: {user?.email}</p>
                <p className="text-xs text-muted-foreground">User ID: {user?.subject}</p>
              </div>
            )}
            {!isLoading && !isAuthenticated && (
              <p className="text-amber-600 font-medium">❌ Not authenticated</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold mb-2">Test Actions:</h3>
            {!isAuthenticated ? (
              <div className="space-y-2">
                <Link href="/login">
                  <Button className="w-full">Go to Login Page</Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  You'll need a valid email and 7-digit student ID
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/dashboard">
                  <Button className="w-full" variant="outline">Go to Dashboard</Button>
                </Link>
                <LogoutButton />
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Quick Links:</h3>
            <div className="space-y-2">
              <Link href="/" className="block text-sm text-blue-600 hover:underline">
                ← Back to Home
              </Link>
              <Link href="/student" className="block text-sm text-blue-600 hover:underline">
                Student Page
              </Link>
              <Link href="/admin" className="block text-sm text-blue-600 hover:underline">
                Admin Page
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

