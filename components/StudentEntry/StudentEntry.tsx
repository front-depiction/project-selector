"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

// ============================================================================
// CONSTANTS
// ============================================================================

const STUDENT_ID_LENGTH = 7
const DIGITS_ONLY = /^[0-9]+$/

// ============================================================================
// TYPES
// ============================================================================

export interface StudentEntryState {
  readonly value: string
  readonly isComplete: boolean
}

export interface StudentEntryActions {
  readonly setValue: (value: string) => void
  readonly handleComplete: () => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const StudentEntryContext = React.createContext<
  (StudentEntryState & StudentEntryActions) | null
>(null)

export const useStudentEntry = () => {
  const context = React.useContext(StudentEntryContext)
  if (!context) {
    throw new Error("useStudentEntry must be used within StudentEntryProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface ProviderProps {
  readonly children: React.ReactNode
}

export const Provider: React.FC<ProviderProps> = ({ children }) => {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [prevValue, setPrevValue] = React.useState("")
  
  const isComplete = value.length === STUDENT_ID_LENGTH && DIGITS_ONLY.test(value)
  
  // Move the completion logic to useEffect
  React.useEffect(() => {
    if (isComplete && value !== prevValue) {
      setPrevValue(value)
      localStorage.setItem("studentId", value)
      router.push("/student/select")
    }
  }, [isComplete, value, prevValue, router])
  
  const handleComplete = React.useCallback(() => {
    if (isComplete) {
      localStorage.setItem("studentId", value)
      router.push("/student/select")
    }
  }, [isComplete, value, router])
  
  const setDigitsOnly = React.useCallback((v: string) => {
    const digits = v.replace(/\D/g, "")
    setValue(digits)
  }, [])
  
  const contextValue = React.useMemo(
    () => ({
      value,
      isComplete,
      setValue: setDigitsOnly,
      handleComplete,
    }),
    [value, isComplete, setDigitsOnly, handleComplete]
  )
  
  return (
    <StudentEntryContext.Provider value={contextValue}>
      {children}
    </StudentEntryContext.Provider>
  )
}

// ============================================================================
// COMPONENTS - Layout
// ============================================================================

export const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center px-4">
    <div className="w-full max-w-3xl flex flex-col items-center text-center gap-6">
      {children}
    </div>
  </div>
)

export const Header: React.FC = () => (
  <div className="space-y-2">
    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
      Enter Your Student ID
    </h1>
    <p className="text-sm sm:text-base text-muted-foreground">
      Type your 7-digit ID to continue to topic selection
    </p>
  </div>
)

export const HelpText: React.FC = () => (
  <p className="text-xs text-muted-foreground">Digits only • 7 characters</p>
)

// ============================================================================
// COMPONENTS - Input
// ============================================================================

export const StudentIdInput: React.FC = () => {
  const { value, setValue } = useStudentEntry()
  
  return (
    <InputOTP
      maxLength={STUDENT_ID_LENGTH}
      value={value}
      onChange={setValue}
      containerClassName="justify-center"
      className="text-2xl sm:text-3xl"
    >
      <InputOTPGroup>
        {Array.from({ length: STUDENT_ID_LENGTH }).map((_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}