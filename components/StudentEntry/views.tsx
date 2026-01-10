"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import * as SE from "./StudentEntry"

// ============================================================================
// COMPOSED VIEW
// ============================================================================

export const StudentEntryView: React.FC = () => (
  <SE.Frame>
    <div className="absolute top-4 left-4">
      <Link href="/">
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-primary/5 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </Link>
    </div>
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