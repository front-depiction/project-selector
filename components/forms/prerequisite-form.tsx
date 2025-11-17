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
// TYPES
// ============================================================================

const prerequisiteFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  requiredValue: z.number().min(0).max(1)
})

export type PrerequisiteFormValues = z.infer<typeof prerequisiteFormSchema>

export interface PrerequisiteFormProps {
  readonly initialValues?: Partial<PrerequisiteFormValues>
  readonly onSubmit: (values: PrerequisiteFormValues) => Promise<void>
}

// ============================================================================
// CONTEXT
// ============================================================================

const PrerequisiteFormContext = React.createContext<{
  form: ReturnType<typeof useForm<PrerequisiteFormValues>>
  title: string
  description: string
  requiredValue: number
  errors: any
  isSubmitting: boolean
  updateTitle: (title: string) => void
  updateDescription: (description: string) => void
  updateRequiredValue: (requiredValue: number) => void
  reset: () => void
  submit: () => void
} | null>(null)

export const usePrerequisiteFormContext = () => {
  const context = React.useContext(PrerequisiteFormContext)
  if (!context) {
    throw new Error("usePrerequisiteFormContext must be used within PrerequisiteFormProvider")
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface PrerequisiteFormProviderProps {
  readonly children: React.ReactNode
  readonly initialValues?: Partial<PrerequisiteFormValues>
  readonly onSubmit: (values: PrerequisiteFormValues) => Promise<void>
}

export const PrerequisiteFormProvider: React.FC<PrerequisiteFormProviderProps> = ({
  children,
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

  const title = form.watch("title")
  const description = form.watch("description") || ""
  const requiredValue = form.watch("requiredValue")
  const errors = form.formState.errors

  const updateTitle = (title: string) => form.setValue("title", title)
  const updateDescription = (description: string) => form.setValue("description", description)
  const updateRequiredValue = (requiredValue: number) => form.setValue("requiredValue", requiredValue)

  const reset = () => form.reset()

  const submit = React.useCallback(async () => {
    const isValid = await form.trigger()
    if (!isValid) return
    
    const values = form.getValues()
    setIsSubmitting(true)
    try {
      await onSubmit(values)
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onSubmit])

  const value = React.useMemo(
    () => ({
      form,
      title,
      description,
      requiredValue,
      errors,
      isSubmitting,
      updateTitle,
      updateDescription,
      updateRequiredValue,
      reset,
      submit
    }),
    [form, title, description, requiredValue, errors, isSubmitting, updateTitle, updateDescription, updateRequiredValue, reset, submit]
  )

  return (
    <PrerequisiteFormContext.Provider value={value}>
      {children}
    </PrerequisiteFormContext.Provider>
  )
}

// ============================================================================
// COMPONENTS - Atomic building blocks
// ============================================================================

export const TitleField: React.FC = () => {
  const { title, errors, updateTitle, isSubmitting } = usePrerequisiteFormContext()

  return (
    <div>
      <Label htmlFor="title" className="mb-1">Title</Label>
      <Input
        id="title"
        value={title}
        onChange={(e) => updateTitle(e.target.value)}
        placeholder="Enter prerequisite title"
        disabled={isSubmitting}
      />
      {errors.title && (
        <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
      )}
    </div>
  )
}

export const DescriptionField: React.FC = () => {
  const { description, errors, updateDescription, isSubmitting } = usePrerequisiteFormContext()

  return (
    <div>
      <Label htmlFor="description" className="mb-1">Description</Label>
      <Textarea
        id="description"
        value={description}
        onChange={(e) => updateDescription(e.target.value)}
        placeholder="Enter prerequisite description (optional)"
        rows={3}
        disabled={isSubmitting}
      />
      {errors.description && (
        <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
      )}
    </div>
  )
}

export const RequiredField: React.FC = () => {
  const { requiredValue, updateRequiredValue, isSubmitting } = usePrerequisiteFormContext()

  return (
    <>
      <div className="flex items-center space-x-2">
        <Switch
          id="requiredValue"
          checked={requiredValue === 1}
          onCheckedChange={(checked) => updateRequiredValue(checked ? 1 : 0)}
          disabled={isSubmitting}
        />
        <Label htmlFor="requiredValue">Allow topic if student meets prerequisite = 1</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Current value: {requiredValue} ({requiredValue === 1 ? "True" : "False"})
      </p>
    </>
  )
}

export const FormActions: React.FC<{ initialValues?: Partial<PrerequisiteFormValues> }> = ({ initialValues }) => {
  const { isSubmitting, reset, submit } = usePrerequisiteFormContext()

  return (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={reset}
        disabled={isSubmitting}
      >
        Reset
      </Button>
      <Button type="button" onClick={submit} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : initialValues ? "Update Prerequisite" : "Create Prerequisite"}
      </Button>
    </div>
  )
}

// ============================================================================
// MAIN FORM COMPONENT
// ============================================================================

export const PrerequisiteForm: React.FC<PrerequisiteFormProps> = ({
  initialValues,
  onSubmit
}) => {
  return (
    <PrerequisiteFormProvider initialValues={initialValues} onSubmit={onSubmit}>
      <div className="space-y-6">
        <div className="space-y-4">
          <TitleField />
          <DescriptionField />
          <RequiredField />
        </div>
        <FormActions initialValues={initialValues} />
      </div>
    </PrerequisiteFormProvider>
  )
}
