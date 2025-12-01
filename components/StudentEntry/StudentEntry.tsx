"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSignals } from "@preact/signals-react/runtime"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { createStudentEntryVM, type StudentEntryVM } from "./StudentEntryVM"

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
  const router = useRouter()

  // Create the View Model using factory (once per component lifetime)
  const vmRef = React.useRef<StudentEntryVM | null>(null)
  if (vmRef.current === null) {
    vmRef.current = createStudentEntryVM({
      onComplete: (studentId: string) => {
        router.push("/student/select")
      },
    })
  }
  const vm = vmRef.current

  // React compiler handles memoization - no useMemo needed
  return (
    <StudentEntryContext.Provider value={{
      get value() { return vm.value$.value },
      get isComplete() { return vm.isComplete$.value },
      setValue: vm.setValue,
      handleComplete: vm.handleComplete,
    }}>
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
  useSignals()
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