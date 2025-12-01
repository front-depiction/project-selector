"use client"
import { signal, ReadonlySignal } from "@preact/signals-react"
import type { ElementType } from "react"

// ============================================================================
// View Model Types
// ============================================================================

export interface Team {
  readonly name: string
  readonly logo: ElementType
  readonly plan: string
}

export interface TeamSwitcherVM {
  // Reactive state
  readonly activeTeam$: ReadonlySignal<Team | null>

  // Actions
  readonly setActiveTeam: (team: Team) => void
}

// ============================================================================
// Hook
// ============================================================================

export function useTeamSwitcherVM(teams: readonly Team[]): TeamSwitcherVM {
  // Active team state - initialize with first team
  const activeTeam$ = signal<Team | null>(teams[0] ?? null)

  // ============================================================================
  // Actions
  // ============================================================================

  const setActiveTeam = (team: Team): void => {
    activeTeam$.value = team
  }

  return {
    activeTeam$,
    setActiveTeam
  }
}
