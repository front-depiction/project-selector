"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Pure validation function
const validateStudentId = (id: string): boolean =>
  /^[A-Z0-9]{6,12}$/.test(id)

// Pure error message function
const getErrorMessage = (id: string): string | null => {
  if (id.length === 0) return null
  if (id.length < 6) return "Student ID must be at least 6 characters"
  if (id.length > 12) return "Student ID must be at most 12 characters"
  if (!validateStudentId(id)) return "Student ID must contain only letters and numbers"
  return null
}

export default function StudentEntry() {
  const [studentId, setStudentId] = useState("")
  const [touched, setTouched] = useState(false)
  const router = useRouter()

  const errorMessage = touched ? getErrorMessage(studentId) : null
  const isValid = validateStudentId(studentId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    
    if (isValid) {
      localStorage.setItem("studentId", studentId)
      router.push("/student/select")
    }
  }

  const handleChange = (value: string) => {
    setStudentId(value.toUpperCase())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Project Topic Selection</CardTitle>
          <CardDescription>
            Enter your student ID to access the topic selection system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Enter your Student ID"
                className={errorMessage ? "border-red-500" : ""}
                autoComplete="off"
                required
              />
              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
              <p className="text-xs text-muted-foreground">
                6-12 alphanumeric characters (e.g., ABC123)
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={!studentId}>
              Continue to Selection
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}