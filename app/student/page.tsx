"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

// 7-digit numeric student ID, e.g., 7896729
const STUDENT_ID_LENGTH = 7
const DIGITS_ONLY = /^[0-9]+$/

export default function StudentEntry() {
  const router = useRouter()
  const [value, setValue] = React.useState("")

  const isComplete = value.length === STUDENT_ID_LENGTH && DIGITS_ONLY.test(value)

  React.useEffect(() => {
    if (isComplete) {
      localStorage.setItem("studentId", value)
      router.push("/student/select")
    }
  }, [isComplete, value, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-3xl flex flex-col items-center text-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Enter Your Student ID
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Type your 7-digit ID to continue to topic selection
          </p>
        </div>

        <InputOTP
          maxLength={STUDENT_ID_LENGTH}
          value={value}
          onChange={(v) => {
            // keep only digits
            const digits = v.replace(/\D/g, "")
            setValue(digits)
          }}
          containerClassName="justify-center"
          className="text-2xl sm:text-3xl"
        >
          <InputOTPGroup>
            {Array.from({ length: STUDENT_ID_LENGTH }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <p className="text-xs text-muted-foreground">Digits only • 7 characters</p>
      </div>
    </div>
  )
}