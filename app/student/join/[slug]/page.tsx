"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { signal } from "@preact/signals-react"
import { PeriodJoinPage, createPeriodJoinPageVM, type PeriodStatusResponse } from "@/components/StudentEntry"

/**
 * Hook to create PeriodJoinPage VM with Convex queries
 * Follows the pattern from /app/student/select/page.tsx
 */
function usePeriodJoinPageVM(slug: string) {
  const router = useRouter()

  // Query period by slug with detailed status
  const periodStatusData = useQuery(api.selectionPeriods.getPeriodBySlugWithStatus, { slug })

  // Mutation for validating access code
  const validateCode = useMutation(api.periodStudentAccessCodes.validateAccessCodeForPeriod)

  // Create stable signal for period status data - follows LandingPage pattern
  const periodStatusData$ = React.useMemo(() => signal<PeriodStatusResponse | undefined>(periodStatusData), [])

  // Sync signal with query data
  React.useEffect(() => {
    periodStatusData$.value = periodStatusData
  }, [periodStatusData, periodStatusData$])

  // Create VM once with stable dependencies
  const vm = React.useMemo(
    () =>
      createPeriodJoinPageVM({
        periodStatusData$,
        validateAccessCode: async (args) => {
          return validateCode(args)
        },
        onSuccess: (accessCode) => {
          localStorage.setItem("studentId", accessCode)
          router.push("/student/select")
        },
      }),
    [periodStatusData$, validateCode, router]
  )

  return vm
}

/**
 * Dynamic Route Page for Student Join Flow
 * URL: /student/join/[slug]
 *
 * This page allows students to join a selection period using a shareable link.
 * The slug parameter identifies the period, and students enter their access code
 * to authenticate and proceed to the selection page.
 */
export default function StudentJoinPage(): React.ReactElement {
  const params = useParams()
  const slug = params.slug as string

  const vm = usePeriodJoinPageVM(slug)

  return <PeriodJoinPage vm={vm} />
}
