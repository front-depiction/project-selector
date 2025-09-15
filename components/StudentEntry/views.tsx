"use client"

import * as React from "react"
import * as SE from "./StudentEntry"

// ============================================================================
// COMPOSED VIEW
// ============================================================================

export const StudentEntryView: React.FC = () => (
  <SE.Frame>
    <SE.Header />
    <SE.StudentIdInput />
    <SE.HelpText />
  </SE.Frame>
)

// ============================================================================
// ROOT COMPONENT WITH PROVIDER
// ============================================================================

export const StudentEntry: React.FC = () => (
  <SE.Provider>
    <StudentEntryView />
  </SE.Provider>
)