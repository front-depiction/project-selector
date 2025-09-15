"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export const StudentsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Students Management</h2>
      
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>View and manage student selections and assignments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Student management features coming soon. You'll be able to view student preferences, 
            manage assignments, and track participation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}