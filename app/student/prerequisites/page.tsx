"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "motion/react"
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  UserCheck,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

// Prerequisite Row Component
const PrerequisiteRow = ({
  prerequisite,
  isMet,
  onChange,
  index
}: {
  prerequisite: any
  isMet: boolean
  onChange: (value: boolean) => void
  index: number
}) => {
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
          onCheckedChange={onChange}
          className="flex-shrink-0"
        />
      </div>
    </motion.div>
  )
}

export default function PrerequisitesEvaluation() {
  const router = useRouter()
  
  // Get student ID from localStorage
  const studentId = typeof window !== "undefined" ? localStorage.getItem("studentId") || "" : ""
  
  // Redirect if no student ID
  useEffect(() => {
    if (!studentId) {
      router.push("/student")
    }
  }, [studentId, router])
  
  const [evaluations, setEvaluations] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get prerequisites with student evaluations
  const prerequisitesWithEvaluations = useQuery(
    api.studentPrerequisites.getPrerequisitesWithStudentEvaluations,
    studentId ? { studentId } : "skip"
  )
  
  // Check if student has completed evaluations
  const completionStatus = useQuery(
    api.studentPrerequisites.hasCompletedPrerequisiteEvaluations,
    studentId ? { studentId } : "skip"
  )
  
  // Save evaluations mutation
  const saveEvaluations = useMutation(api.studentPrerequisites.saveStudentPrerequisiteEvaluations)
  
  // Redirect to topic selection if already completed or no prerequisites
  useEffect(() => {
    if (completionStatus?.isComplete || (prerequisitesWithEvaluations && prerequisitesWithEvaluations.length === 0)) {
      router.push("/student/select")
    }
  }, [completionStatus, prerequisitesWithEvaluations, router])
  
  // Initialize evaluations from existing data
  useEffect(() => {
    if (prerequisitesWithEvaluations) {
      const initialEvaluations: Record<string, boolean> = {}
      prerequisitesWithEvaluations.forEach(prereq => {
        if (prereq.studentEvaluation) {
          initialEvaluations[prereq._id] = prereq.studentEvaluation.isMet
        } else {
          initialEvaluations[prereq._id] = false // Default to false
        }
      })
      setEvaluations(initialEvaluations)
    }
  }, [prerequisitesWithEvaluations])
  
  // Handle evaluation change
  const handleEvaluationChange = (prerequisiteId: string, isMet: boolean) => {
    setEvaluations(prev => ({
      ...prev,
      [prerequisiteId]: isMet
    }))
  }
  
  // Handle continue to topic selection
  const handleContinue = async () => {
    if (!prerequisitesWithEvaluations || !studentId) return
    
    setIsSaving(true)
    setError(null)
    
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prerequisites")
      toast.error("Failed to save prerequisites")
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!prerequisitesWithEvaluations) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (prerequisitesWithEvaluations.length === 0) {
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
  
  const totalCount = prerequisitesWithEvaluations.length
  const allCompleted = Object.keys(evaluations).length === totalCount
  

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        {/* Header Navigation */}
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
        

        
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
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
          )}
        </AnimatePresence>
        
        {/* Prerequisites List */}
        <div className="mb-8 space-y-1">
          {prerequisitesWithEvaluations.map((prerequisite, index) => (
            <PrerequisiteRow
              key={prerequisite._id}
              prerequisite={prerequisite}
              isMet={evaluations[prerequisite._id] || false}
              onChange={(isMet) => handleEvaluationChange(prerequisite._id, isMet)}
              index={index}
            />
          ))}
        </div>
        
        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex justify-center"
        >
          <Button
            onClick={handleContinue}
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
        

      </div>
    </div>
  )
}