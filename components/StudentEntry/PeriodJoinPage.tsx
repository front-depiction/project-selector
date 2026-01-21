"use client"

import * as React from "react"
import * as Option from "effect/Option"
import { useSignals } from "@preact/signals-react/runtime"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, KeyRound, Sparkles, User } from "lucide-react"
import type { PeriodJoinPageVM } from "./PeriodJoinPageVM"

// ============================================================================
// TYPES
// ============================================================================

export interface PeriodJoinPageProps {
  readonly vm: PeriodJoinPageVM
}

// ============================================================================
// COMPONENTS - Layout
// ============================================================================

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center px-4 relative bg-gradient-to-br from-background via-background to-primary/5">
    <div className="w-full max-w-xl flex flex-col items-center text-center gap-6">
      {children}
    </div>
  </div>
)

// ============================================================================
// COMPONENTS - Loading State
// ============================================================================

const LoadingState: React.FC = () => (
  <Frame>
    <Card className="w-full border-primary/10 shadow-lg">
      <CardHeader className="space-y-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-10 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-4 w-48 mx-auto" />
      </CardContent>
    </Card>
  </Frame>
)

// ============================================================================
// COMPONENTS - Error State
// ============================================================================

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <Frame>
    <Card className="w-full border-destructive/20 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <CardTitle className="text-2xl font-bold">Unable to Load</CardTitle>
        <CardDescription className="text-base mt-2">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Please check the link and try again, or contact your instructor.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  </Frame>
)

// ============================================================================
// COMPONENTS - Period Header
// ============================================================================

interface PeriodHeaderProps {
  readonly title: string
  readonly description: string
}

const PeriodHeader: React.FC<PeriodHeaderProps> = ({ title, description }) => (
  <CardHeader className="text-center pb-4">
    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
      <Sparkles className="h-8 w-8 text-primary" />
    </div>
    <CardTitle className="text-2xl sm:text-3xl font-bold">
      {title}
    </CardTitle>
    <CardDescription className="text-base mt-2 max-w-md mx-auto">
      {description}
    </CardDescription>
  </CardHeader>
)

// ============================================================================
// COMPONENTS - Code Entry Form
// ============================================================================

interface CodeEntryFormProps {
  readonly accessCode: string
  readonly isValidating: boolean
  readonly codeError: Option.Option<string>
  readonly accessMode: "code" | "student_id"
  readonly onCodeChange: (code: string) => void
  readonly onSubmit: () => void
}

const CodeEntryForm: React.FC<CodeEntryFormProps> = ({
  accessCode,
  isValidating,
  codeError,
  accessMode,
  onCodeChange,
  onSubmit,
}) => (
  <CardContent className="space-y-6">
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
        {accessMode === "code" ? (
          <>
            <KeyRound className="h-4 w-4" />
            <span>Enter your access code</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            <span>Enter your student ID</span>
          </>
        )}
      </div>

      {accessMode === "code" ? (
        <>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={accessCode}
              onChange={onCodeChange}
              disabled={isValidating}
              containerClassName="justify-center"
              className="text-2xl sm:text-3xl"
              pattern="[A-Za-z0-9]*"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="uppercase h-12 w-10 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Letters & numbers only - 6 characters
          </p>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="space-y-4"
        >
          <Input
            type="text"
            value={accessCode}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Enter your student ID"
            className="text-center text-lg uppercase"
            disabled={isValidating}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isValidating || accessCode.length === 0}
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Continuing...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}
    </div>

    {/* Validation Loading State (only for code mode) */}
    {accessMode === "code" && isValidating && (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Validating your code...</span>
      </div>
    )}

    {/* Code Error Display */}
    {Option.match(codeError, {
      onNone: () => null,
      onSome: (error) => (
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ),
    })}
  </CardContent>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PeriodJoinPage({ vm }: PeriodJoinPageProps): React.ReactElement {
  // Enable automatic reactivity for signals
  useSignals()

  // Loading state
  if (vm.isLoading$.value) {
    return <LoadingState />
  }

  // Error state (period not found)
  const errorResult = Option.match(vm.error$.value, {
    onNone: () => null,
    onSome: (errorMessage) => <ErrorState message={errorMessage} />,
  })

  if (errorResult) {
    return errorResult
  }

  // Main view - period info with code entry
  return Option.match(vm.periodInfo$.value, {
    onNone: () => <ErrorState message="Period information not available" />,
    onSome: (period) => (
      <Frame>
        <Card className="w-full border-primary/10 shadow-lg bg-gradient-to-b from-card to-card/95">
          <PeriodHeader
            title={period.title}
            description={period.description}
          />
          <CodeEntryForm
            accessCode={vm.accessCode$.value}
            isValidating={vm.isValidating$.value}
            codeError={vm.codeError$.value}
            accessMode={period.accessMode}
            onCodeChange={vm.setAccessCode}
            onSubmit={vm.submitCode}
          />
        </Card>
      </Frame>
    ),
  })
}
