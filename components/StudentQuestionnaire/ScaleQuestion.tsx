"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"

interface ScaleQuestionProps {
  readonly value?: number
  readonly onChange: (value: number) => void
}

export const ScaleQuestion: React.FC<ScaleQuestionProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>0 - Not at all</span>
        <span>6 - Extremely</span>
      </div>
      <Slider
        value={[value ?? 3]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={6}
        step={1}
        className="w-full"
      />
      <div className="text-center text-4xl font-bold">
        {value ?? 3}
      </div>
    </div>
  )
}
