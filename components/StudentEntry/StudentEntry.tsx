"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSignals } from "@preact/signals-react/runtime"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useStudentEntryVM, type StudentEntryVM } from "./StudentEntryVM"

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
// CONTEXT (for child components)
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
  useSignals()
  const router = useRouter()

  // Create the View Model
  const vm = useStudentEntryVM({
    onComplete: (studentId: string) => {
      router.push("/student/select")
    },
  })

  // Read reactive values directly from signals
  const value = vm.value$.value
  const isComplete = vm.isComplete$.value

  // Create context value that matches the old API for child components
  const contextValue = React.useMemo(
    () => ({
      value,
      isComplete,
      setValue: vm.setValue,
      handleComplete: vm.handleComplete,
    }),
    [value, isComplete, vm.setValue, vm.handleComplete]
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
      maxLength={7}
      value={value}
      onChange={setValue}
      containerClassName="justify-center"
      className="text-2xl sm:text-3xl"
    >
      <InputOTPGroup>
        {Array.from({ length: 7 }).map((_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}