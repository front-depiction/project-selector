"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user === null) return null;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <LogoutButton />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Project Selector!</CardTitle>
          <CardDescription>You're successfully authenticated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Student ID:</span> {user.studentId}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">User ID:</span> {user.subject}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

