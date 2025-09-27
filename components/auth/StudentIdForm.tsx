"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const STUDENT_ID_LENGTH = 7
const DIGITS_ONLY = /^[0-9]+$/

export function StudentIdForm() {
  const { user } = useUser()
  const router = useRouter()
  const [studentId, setStudentId] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const currentUser = useQuery(
    api.users.getUserByClerkId, 
    user ? { clerkUserId: user.id } : "skip"
  )
  const updateStudentId = useMutation(api.users.updateStudentId)
  const getOrCreateUser = useMutation(api.users.getOrCreateUser)

  // Initialize user when they first sign in
  React.useEffect(() => {
    if (user && !currentUser) {
      getOrCreateUser({
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      }).catch(console.error)
    }
  }, [user, currentUser, getOrCreateUser])

  // Redirect if user already has student ID
  React.useEffect(() => {
    if (currentUser?.studentId) {
      router.push("/student/select")
    }
  }, [currentUser, router])

  const handleSubmit = async () => {
    if (studentId.length !== STUDENT_ID_LENGTH || !DIGITS_ONLY.test(studentId)) {
      toast.error("Please enter a valid 7-digit student ID")
      return
    }

    if (!user) {
      toast.error("Not authenticated")
      return
    }

    setIsSubmitting(true)
    try {
      await updateStudentId({ 
        clerkUserId: user.id,
        studentId 
      })
      toast.success("Student ID linked successfully!")
      router.push("/student/select")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to link student ID"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStudentIdChange = (value: string) => {
    const digits = value.replace(/\D/g, "")
    setStudentId(digits)
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Link Your Student ID</CardTitle>
          <p className="text-muted-foreground">
            Welcome {user.firstName}! Please enter your 7-digit student ID to continue.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              maxLength={STUDENT_ID_LENGTH}
              value={studentId}
              onChange={handleStudentIdChange}
              containerClassName="justify-center"
              className="text-2xl"
            >
              <InputOTPGroup>
                {Array.from({ length: STUDENT_ID_LENGTH }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            
            <p className="text-sm text-muted-foreground text-center">
              Enter your university student ID number
            </p>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={studentId.length !== STUDENT_ID_LENGTH || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Linking..." : "Continue to Topic Selection"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Your student ID will be used to track your project preferences
              and ensure proper assignment allocation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
