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
import { Loader2, AlertCircle, KeyRound, Sparkles, User, Clock, CheckCircle2, XCircle, HelpCircle } from "lucide-react"
import type { PeriodJoinPageVM, PeriodError, PeriodErrorType } from "./PeriodJoinPageVM"

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

interface ErrorStateConfig {
  readonly icon: React.ReactNode
  readonly title: string
  readonly borderColor: string
  readonly iconBgColor: string
  readonly alertVariant: "destructive" | "default"
  readonly alertTitle: string
  readonly alertDescription: string
}

function getErrorStateConfig(errorType: PeriodErrorType): ErrorStateConfig {
  switch (errorType) {
    case "inactive":
      return {
        icon: <Clock className="h-10 w-10 text-amber-600" />,
        title: "Not Yet Open",
        borderColor: "border-amber-500/20",
        iconBgColor: "bg-amber-500/10",
        alertVariant: "default",
        alertTitle: "Coming Soon",
        alertDescription: "Check back when the selection period opens, or contact your instructor for more details.",
      }
    case "closed":
      return {
        icon: <XCircle className="h-10 w-10 text-muted-foreground" />,
        title: "Selection Closed",
        borderColor: "border-muted",
        iconBgColor: "bg-muted",
        alertVariant: "default",
        alertTitle: "Period Ended",
        alertDescription: "The submission window for this selection period has passed.",
      }
    case "assigned":
      return {
        icon: <CheckCircle2 className="h-10 w-10 text-green-600" />,
        title: "Assignments Complete",
        borderColor: "border-green-500/20",
        iconBgColor: "bg-green-500/10",
        alertVariant: "default",
        alertTitle: "Already Assigned",
        alertDescription: "Final assignments have been made. Contact your instructor if you have questions.",
      }
    case "not_found":
    default:
      return {
        icon: <HelpCircle className="h-10 w-10 text-destructive" />,
        title: "Not Found",
        borderColor: "border-destructive/20",
        iconBgColor: "bg-destructive/10",
        alertVariant: "destructive",
        alertTitle: "Error",
        alertDescription: "Please check the link and try again, or contact your instructor.",
      }
  }
}

interface ErrorStateProps {
  readonly error: PeriodError
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  const config = getErrorStateConfig(error.type)

  return (
    <Frame>
      <Card className={`w-full ${config.borderColor} shadow-lg`}>
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto mb-4 h-16 w-16 rounded-full ${config.iconBgColor} flex items-center justify-center`}>
            {config.icon}
          </div>
          <CardTitle className="text-2xl font-bold">{config.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant={config.alertVariant}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{config.alertTitle}</AlertTitle>
            <AlertDescription>
              {config.alertDescription}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </Frame>
  )
}

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
  readonly vm: PeriodJoinPageVM
  readonly accessMode: "code" | "student_id"
  readonly codeLength: number
}

const CodeEntryForm: React.FC<CodeEntryFormProps> = ({
  vm,
  accessMode,
  codeLength,
}) => {
  useSignals()

  // Read signals directly for reactivity
  const accessCode = vm.accessCode$.value
  const isValidating = vm.isValidating$.value
  const codeError = vm.codeError$.value

  return (
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
              maxLength={codeLength}
              value={accessCode}
              onChange={vm.setAccessCode}
              disabled={isValidating}
              containerClassName="justify-center"
              className="text-2xl sm:text-3xl"
            >
              <InputOTPGroup>
                {Array.from({ length: codeLength }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="uppercase h-12 w-10 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Letters & numbers only - {codeLength} characters
          </p>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            vm.submitCode()
          }}
          className="space-y-4"
        >
          <Input
            type="text"
            value={accessCode}
            onChange={(e) => vm.setAccessCode(e.target.value)}
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
}

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

  // Error state (period not found, inactive, closed, or assigned)
  const errorResult = Option.match(vm.error$.value, {
    onNone: () => null,
    onSome: (error) => <ErrorState error={error} />,
  })

  if (errorResult) {
    return errorResult
  }

  // Main view - period info with code entry
  return Option.match(vm.periodInfo$.value, {
    onNone: () => <ErrorState error={{ type: "not_found", message: "Period information not available." }} />,
    onSome: (period) => (
      <Frame>
        <Card className="w-full border-primary/10 shadow-lg bg-gradient-to-b from-card to-card/95">
          <PeriodHeader
            title={period.title}
            description={period.description}
          />
          <CodeEntryForm
            vm={vm}
            accessMode={period.accessMode}
            codeLength={period.codeLength}
          />
        </Card>
      </Frame>
    ),
  })
}
