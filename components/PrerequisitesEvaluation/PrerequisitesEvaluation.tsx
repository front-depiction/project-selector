"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "motion/react"
import {
  Loader2,
  ArrowLeft,
  AlertCircle,
  Info,
  ArrowRight,
  UserCheck,
  BookOpen
} from "lucide-react"
import Link from "next/link"
import type { Id } from "@/convex/_generated/dataModel"

// ============================================================================
// TYPES
// ============================================================================

export interface PrerequisiteWithEvaluation {
  _id: Id<"prerequisites">
  title: string
  description?: string
  requiredValue: number
  studentEvaluation?: {
    _id: Id<"studentPrerequisites">
    _creationTime: number
    studentId: string
    prerequisiteId: Id<"prerequisites">
    isMet: boolean
    lastUpdated: number
  } | null
}

export interface PrerequisitesEvaluationState {
  readonly studentId: string
  readonly evaluations: Record<string, boolean>
  readonly isSaving: boolean
  readonly error: string | null
  readonly prerequisitesWithEvaluations?: PrerequisiteWithEvaluation[]
  readonly completionStatus?: { isComplete: boolean }
  readonly isLoading: boolean
}

export interface PrerequisitesEvaluationActions {
  readonly updateEvaluation: (prerequisiteId: string, isMet: boolean) => void
  readonly saveEvaluations: () => Promise<void>
  readonly clearError: () => void
}

// ============================================================================
// HOOKS - Business Logic
// ============================================================================

export const usePrerequisitesEvaluationData = (studentId: string) => {
  const prerequisitesWithEvaluations = useQuery(
    api.studentPrerequisites.getPrerequisitesWithStudentEvaluations,
    studentId ? { studentId } : "skip"
  )
  
  const completionStatus = useQuery(
    api.studentPrerequisites.hasCompletedPrerequisiteEvaluations,
    studentId ? { studentId } : "skip"
  )
  
  return {
    prerequisitesWithEvaluations,
    completionStatus,
    isLoading: !prerequisitesWithEvaluations || !completionStatus
  }
}

export const usePrerequisitesEvaluationActions = (studentId: string) => {
  const router = useRouter()
  const saveEvaluations = useMutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluations)
  
  const saveEvaluationsAction = React.useCallback(
    async (evaluations: Record<string, boolean>) => {
      const evaluationData = Object.entries(evaluations).map(([prerequisiteId, isMet]) => ({
        prerequisiteId: prerequisiteId as Id<"prerequisites">,
        isMet
      }))
      
      await saveEvaluations({
        studentId,
        evaluations: evaluationData
      })
      
      toast.success("Prerequisites saved successfully!")
      router.push("/student/select")
    },
    [studentId, saveEvaluations, router]
  )
  
  return { saveEvaluationsAction }
}

// ============================================================================
// CONTEXT
// ============================================================================

const PrerequisitesEvaluationContext = React.createContext<
  (PrerequisitesEvaluationState & PrerequisitesEvaluationActions) | null
>(null)

export const usePrerequisitesEvaluation = () => {
  const context = React.useContext(PrerequisitesEvaluationContext)
  if (!context) {
    throw new Error("usePrerequisitesEvaluation must be used within PrerequisitesEvaluationProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface PrerequisitesEvaluationProviderProps {
  readonly children: React.ReactNode
  readonly studentId: string
}

export const PrerequisitesEvaluationProvider: React.FC<PrerequisitesEvaluationProviderProps> = ({
  children,
  studentId
}) => {
  const router = useRouter()
  const { prerequisitesWithEvaluations, completionStatus, isLoading } = usePrerequisitesEvaluationData(studentId)
  const { saveEvaluationsAction } = usePrerequisitesEvaluationActions(studentId)
  
  // Initialize evaluations from existing data - calculated during render, not in useEffect
  const initialEvaluations = React.useMemo(() => {
    if (!prerequisitesWithEvaluations) return {}
    
    const evaluations: Record<string, boolean> = {}
    prerequisitesWithEvaluations.forEach(prereq => {
      if (prereq.studentEvaluation) {
        evaluations[prereq._id] = prereq.studentEvaluation.isMet
      } else {
        evaluations[prereq._id] = false
      }
    })
    return evaluations
  }, [prerequisitesWithEvaluations])
  
  const [evaluations, setEvaluations] = React.useState<Record<string, boolean>>(initialEvaluations)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Update evaluations when initial data changes - calculated during render
  React.useMemo(() => {
    if (prerequisitesWithEvaluations) {
      setEvaluations(initialEvaluations)
    }
  }, [initialEvaluations, prerequisitesWithEvaluations])
  
  const updateEvaluation = React.useCallback((prerequisiteId: string, isMet: boolean) => {
    setEvaluations(prev => ({
      ...prev,
      [prerequisiteId]: isMet
    }))
  }, [])
  
  const saveEvaluations = React.useCallback(async () => {
    if (!prerequisitesWithEvaluations) return
    
    setIsSaving(true)
    setError(null)
    
    try {
      await saveEvaluationsAction(evaluations)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save prerequisites"
      setError(errorMessage)
      toast.error("Failed to save prerequisites")
    } finally {
      setIsSaving(false)
    }
  }, [evaluations, prerequisitesWithEvaluations, saveEvaluationsAction])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  // Redirect logic - calculated during render
  React.useMemo(() => {
    if (!studentId) {
      router.push("/student")
    }
  }, [studentId, router])
  
  React.useMemo(() => {
    if (completionStatus?.isComplete || (prerequisitesWithEvaluations && prerequisitesWithEvaluations.length === 0)) {
      router.push("/student/select")
    }
  }, [completionStatus, prerequisitesWithEvaluations, router])
  
  const value = React.useMemo(
    () => ({
      studentId,
      evaluations,
      isSaving,
      error,
      prerequisitesWithEvaluations,
      completionStatus,
      isLoading,
      updateEvaluation,
      saveEvaluations,
      clearError
    }),
    [
      studentId,
      evaluations,
      isSaving,
      error,
      prerequisitesWithEvaluations,
      completionStatus,
      isLoading,
      updateEvaluation,
      saveEvaluations,
      clearError
    ]
  )
  
  return (
    <PrerequisitesEvaluationContext.Provider value={value}>
      {children}
    </PrerequisitesEvaluationContext.Provider>
  )
}

// ============================================================================
// ATOMIC COMPONENTS
// ============================================================================

export const Header: React.FC = () => {
  const { studentId, prerequisitesWithEvaluations } = usePrerequisitesEvaluation()
  
  const totalCount = prerequisitesWithEvaluations?.length || 0
  
  return (
    <div className="mb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-primary/10 shadow-lg bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))] pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Prerequisites
                </CardTitle>
              </div>
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-sm">
                <BookOpen className="mr-1 h-3 w-3" />
                {totalCount} Required
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
              <span>ID: {studentId}</span>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  )
}

export const PrerequisiteRow: React.FC<{
  readonly prerequisite: PrerequisiteWithEvaluation
  readonly isMet: boolean
  readonly index: number
}> = ({ prerequisite, isMet, index }) => {
  const { updateEvaluation } = usePrerequisitesEvaluation()
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium leading-tight">{prerequisite.title}</div>
          {prerequisite.description && (
            <div className="text-sm text-muted-foreground mt-0.5 leading-tight">
              {prerequisite.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-sm text-muted-foreground hidden sm:block">
          {isMet ? "Met" : "Not met"}
        </span>
        <Switch
          checked={isMet}
          onCheckedChange={(checked: boolean) => updateEvaluation(prerequisite._id, checked)}
          className="flex-shrink-0"
        />
      </div>
    </motion.div>
  )
}

export const PrerequisiteList: React.FC = () => {
  const { prerequisitesWithEvaluations, evaluations } = usePrerequisitesEvaluation()
  
  if (!prerequisitesWithEvaluations) return null
  
  return (
    <div className="mb-8 space-y-1">
      {prerequisitesWithEvaluations.map((prerequisite: PrerequisiteWithEvaluation, index: number) => (
        <PrerequisiteRow
          key={prerequisite._id}
          prerequisite={prerequisite}
          isMet={evaluations[prerequisite._id] || false}
          index={index}
        />
      ))}
    </div>
  )
}

export const ErrorAlert: React.FC = () => {
  const { error, clearError } = usePrerequisitesEvaluation()
  
  if (!error) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-4"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  )
}

export const Actions: React.FC = () => {
  const { prerequisitesWithEvaluations, evaluations, isSaving, saveEvaluations } = usePrerequisitesEvaluation()
  
  if (!prerequisitesWithEvaluations) return null
  
  const totalCount = prerequisitesWithEvaluations.length
  const allCompleted = Object.keys(evaluations).length === totalCount
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="flex justify-center"
    >
      <Button
        onClick={saveEvaluations}
        disabled={!allCompleted || isSaving}
        size="lg"
        className="min-w-[200px]"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Continue to Topic Selection
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </motion.div>
  )
}

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export const EmptyState: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No prerequisites are required for this selection period.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export const Navigation: React.FC = () => {
  return (
    <div className="mb-6">
      <Link href="/student">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 hover:bg-primary/5 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Portal
        </Button>
      </Link>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PrerequisitesEvaluation: React.FC = () => {
  const { isLoading, prerequisitesWithEvaluations } = usePrerequisitesEvaluation()
  
  if (isLoading) {
    return <LoadingState />
  }
  
  if (prerequisitesWithEvaluations?.length === 0) {
    return <EmptyState />
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Navigation />
        <Header />
        <ErrorAlert />
        <PrerequisiteList />
        <Actions />
      </div>
    </div>
  )
}