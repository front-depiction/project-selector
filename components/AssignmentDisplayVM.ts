"use client"
import { signal, computed, ReadonlySignal } from "@preact/signals-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id, Doc } from "@/convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"

// ============================================================================
// Type Definitions for Assignment Query Results
// ============================================================================

/** Shape of a student within an assignment group */
interface AssignmentStudent {
  readonly studentId: string
  readonly name?: string
  readonly originalRank?: number
  readonly assignedAt: number
}

/** Shape of a topic assignment group from the query */
interface TopicAssignment {
  readonly topic: Doc<"topics"> | undefined
  readonly students: readonly AssignmentStudent[]
  readonly qualityAverages: Record<string, number>
}

/** The full assignments response shape */
type AssignmentsResponse = Record<string, TopicAssignment> | null
type AssignmentExportRow = NonNullable<
  FunctionReturnType<typeof api.assignments.getAllAssignmentsForExport>
>[number]

// ============================================================================
// View Model Types
// ============================================================================

export interface StudentItemVM {
  readonly key: string
  readonly studentIdDisplay: string
  readonly isCurrentUser: boolean
  readonly rankDisplay: string | null
  readonly rankBadgeVariant: "default" | "outline"
}

export interface QualityBadgeVM {
  readonly letter: string
  readonly value: string
  readonly fullName: string
}

export interface TopicAssignmentVM {
  readonly key: string
  readonly title: string
  readonly studentCount: number
  readonly studentCountDisplay: string
  readonly isUserAssigned: boolean
  readonly students: readonly StudentItemVM[]
  readonly hasMoreStudents: boolean
  readonly moreStudentsDisplay: string | null
  readonly qualityBadges: readonly QualityBadgeVM[]
}

export interface MyAssignmentVM {
  readonly topicTitle: string
  readonly topicDescription: string | null
  readonly wasTopChoice: boolean
  readonly wasPreference: boolean
  readonly iconType: "trophy" | "award" | "users"
  readonly iconColorClass: string
  readonly badgeText: string | null
  readonly badgeVariant: "default" | "secondary" | "outline"
  readonly badgeIcon: "trophy" | "hash" | "none"
}

export interface StatsVM {
  readonly totalAssigned: number
  readonly matchedCount: number
  readonly alternativeCount: number
  readonly matchRate: string
  readonly topChoiceRate: string
}

export interface AssignmentDisplayVM {
  readonly assignments$: ReadonlySignal<readonly TopicAssignmentVM[]>
  readonly myAssignment$: ReadonlySignal<MyAssignmentVM | null>
  readonly stats$: ReadonlySignal<StatsVM | null>
  readonly isLoading$: ReadonlySignal<boolean>
  readonly isEmpty$: ReadonlySignal<boolean>
  readonly showExportButton$: ReadonlySignal<boolean>
  readonly exportToCSV: () => void
}

// ============================================================================
// Hook - uses Convex as reactive primitive directly
// ============================================================================

export function useAssignmentDisplayVM(
  periodId: Id<"selectionPeriods"> | undefined,
  studentId?: string
): AssignmentDisplayVM {
  // Convex queries - already reactive!
  const assignments = useQuery(
    api.assignments.getAssignments,
    periodId ? { periodId } : "skip"
  )

  const myAssignment = useQuery(
    api.assignments.getMyAssignment,
    periodId && studentId ? { periodId, studentId } : "skip"
  )

  const stats = useQuery(
    api.assignments.getAssignmentStats,
    periodId ? { periodId } : "skip"
  )

  const exportData = useQuery(
    api.assignments.getAllAssignmentsForExport,
    periodId ? { periodId } : "skip"
  )

  // Loading state
  const isLoading$ = computed(() =>
    assignments === undefined ||
    (studentId && myAssignment === undefined) ||
    stats === undefined
  )

  // Empty state
  const isEmpty$ = computed(() =>
    !isLoading$.value &&
    (!assignments || Object.keys(assignments).length === 0)
  )

  // Show export button only for admins (no studentId)
  const showExportButton$ = computed(() => !studentId)

  // Computed: my assignment with pre-formatted display data
  const myAssignment$ = computed((): MyAssignmentVM | null => {
    if (!myAssignment) return null

    const wasTopChoice = myAssignment.wasTopChoice
    const wasPreference = myAssignment.wasPreference

    let iconType: "trophy" | "award" | "users"
    let iconColorClass: string
    let badgeText: string | null
    let badgeVariant: "default" | "secondary" | "outline"
    let badgeIcon: "trophy" | "hash" | "none"

    if (wasTopChoice) {
      iconType = "trophy"
      iconColorClass = "p-2 bg-yellow-100 rounded-full"
      badgeText = "Your top choice!"
      badgeVariant = "default"
      badgeIcon = "trophy"
    } else if (wasPreference) {
      iconType = "award"
      iconColorClass = "p-2 bg-blue-100 rounded-full"
      badgeText = `Rank ${myAssignment.assignment.originalRank}`
      badgeVariant = "secondary"
      badgeIcon = "hash"
    } else {
      iconType = "users"
      iconColorClass = "p-2 bg-gray-100 rounded-full"
      badgeText = "Randomly Assigned"
      badgeVariant = "outline"
      badgeIcon = "none"
    }

    return {
      topicTitle: myAssignment.topic?.title ?? "Unknown Topic",
      topicDescription: myAssignment.topic?.description ?? null,
      wasTopChoice,
      wasPreference,
      iconType,
      iconColorClass,
      badgeText,
      badgeVariant,
      badgeIcon,
    }
  })

  // Computed: stats with pre-formatted display data
  const stats$ = computed((): StatsVM | null => {
    if (!stats) return null

    const matchRate = stats.totalAssignments > 0
      ? Math.round((stats.matchedPreferences / stats.totalAssignments) * 100)
      : 0

    const topChoiceRate = stats.totalAssignments > 0
      ? Math.round((stats.topChoices / stats.totalAssignments) * 100)
      : 0

    return {
      totalAssigned: stats.totalAssignments,
      matchedCount: stats.matchedPreferences,
      alternativeCount: stats.topChoices,
      matchRate: `${matchRate}%`,
      topChoiceRate: `${topChoiceRate}%`,
    }
  })

  // Computed: assignments list with pre-formatted display data
  const assignments$ = computed((): readonly TopicAssignmentVM[] => {
    if (!assignments) return []

    const typedAssignments = assignments as AssignmentsResponse
    if (!typedAssignments) return []

    const topicEntries = Object.entries(typedAssignments).sort(
      ([, a], [, b]) => b.students.length - a.students.length
    )

    // Map category names to letters
    const categoryLetterMap: Record<string, { letter: string; fullName: string }> = {
      "Leader": { letter: "L", fullName: "Leader" },
      "Creative Thinker": { letter: "C", fullName: "Creative Thinker" },
      "Doer": { letter: "D", fullName: "Doer" },
      "IT Professional": { letter: "I", fullName: "IT Professional" },
    }

    return topicEntries.map(([topicId, topicData]): TopicAssignmentVM => {
      const isUserAssigned = myAssignment?.topic?._id === topicId
      const studentCount = topicData.students.length

      // Show all students (no limit)
      const students: StudentItemVM[] = topicData.students.map((student): StudentItemVM => {
        const isCurrentUser = student.studentId === studentId
        const hasRank = student.originalRank != null
        
        // Debug: log student data
        if (process.env.NODE_ENV === 'development') {
          console.log('Student data:', { studentId: student.studentId, name: student.name, hasName: !!student.name })
        }
        
        // Format: "Name (CODE)" if name exists, otherwise just CODE
        // Ensure we're using the actual name, not an initial
        const displayName = student.name && student.name.trim() 
          ? `${student.name.trim()} (${student.studentId})` 
          : student.studentId
        const displayText = isCurrentUser ? `${displayName} (You)` : displayName

        return {
          key: student.studentId,
          studentIdDisplay: displayText,
          isCurrentUser,
          rankDisplay: hasRank ? `#${student.originalRank}` : null,
          rankBadgeVariant: student.originalRank === 1 ? "default" : "outline",
        }
      })

      const hasMoreStudents = false
      const moreStudentsDisplay = null

      // Build quality badges from qualityAverages
      const qualityBadges: QualityBadgeVM[] = []
      if (topicData.qualityAverages) {
        for (const [category, average] of Object.entries(topicData.qualityAverages)) {
          const mapping = categoryLetterMap[category]
          if (mapping && typeof average === "number") {
            qualityBadges.push({
              letter: mapping.letter,
              value: average.toFixed(1),
              fullName: mapping.fullName,
            })
          }
        }
      }

      return {
        key: topicId,
        title: topicData.topic?.title ?? "Unknown Topic",
        studentCount,
        studentCountDisplay: `${studentCount} student${studentCount !== 1 ? 's' : ''}`,
        isUserAssigned,
        students,
        hasMoreStudents,
        moreStudentsDisplay,
        qualityBadges,
      }
    })
  })

  // Export to CSV action
  const exportToCSV = (): void => {
    if (!exportData) return

    const headers = ['student_id', 'assigned_topic']
    const csvContent = [
      headers.join(','),
      ...exportData.map((row: AssignmentExportRow) =>
        `"${row.student_id}","${row.assigned_topic.replace(/"/g, '""')}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `assignments_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    assignments$,
    myAssignment$,
    stats$,
    isLoading$,
    isEmpty$,
    showExportButton$,
    exportToCSV,
  }
}
