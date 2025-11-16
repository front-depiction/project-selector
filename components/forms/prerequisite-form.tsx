"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// ============================================================================
// FORM SCHEMA
// ============================================================================

const prerequisiteFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  requiredValue: z.number().min(0).max(1)
})

export type PrerequisiteFormValues = z.infer<typeof prerequisiteFormSchema>

// ============================================================================
// PROPS
// ============================================================================

export interface PrerequisiteFormProps {
  readonly initialValues?: Partial<PrerequisiteFormValues>
  readonly onSubmit: (values: PrerequisiteFormValues) => Promise<void>
}

// ============================================================================
// PREREQUISITE FORM COMPONENT
// ============================================================================

export const PrerequisiteForm: React.FC<PrerequisiteFormProps> = ({
  initialValues,
  onSubmit
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<PrerequisiteFormValues>({
    resolver: zodResolver(prerequisiteFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      requiredValue: initialValues?.requiredValue ?? 0
    }
  })

  const handleSubmit = async (values: PrerequisiteFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(values)
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...form.register("title")}
            placeholder="Enter prerequisite title"
            disabled={isSubmitting}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...form.register("description")}
            placeholder="Enter prerequisite description (optional)"
            rows={3}
            disabled={isSubmitting}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <Controller
          name="requiredValue"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Switch
                id="requiredValue"
                checked={field.value === 1}
                onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                disabled={isSubmitting}
              />
              <Label htmlFor="requiredValue">Required (True = 1, False = 0)</Label>
            </div>
          )}
        />
        <p className="text-sm text-muted-foreground">
          Current value: {form.watch("requiredValue")} ({form.watch("requiredValue") === 1 ? "True" : "False"})
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialValues ? "Update Prerequisite" : "Create Prerequisite"}
        </Button>
      </div>
    </form>
  )
}