"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BooleanQuestionProps {
  readonly value?: boolean
  readonly onChange: (value: boolean) => void
}

export const BooleanQuestion: React.FC<BooleanQuestionProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-4 justify-center">
      <Button
        type="button"
        size="lg"
        variant={value === true ? "default" : "outline"}
        className={cn("w-32", value === true && "ring-2 ring-primary")}
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        type="button"
        size="lg"
        variant={value === false ? "default" : "outline"}
        className={cn("w-32", value === false && "ring-2 ring-primary")}
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  )
}
