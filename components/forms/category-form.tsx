"use client"
import * as React from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    name: z.string().min(1, "Category name is required").min(2, "Category name must be at least 2 characters"),
    description: z.string().optional(),
    criterionType: z.enum(["prerequisite", "maximize", "minimize", "pull", "push"], {
        message: "Please select how this category should be used"
    }),
    minValue: z.number().min(0).max(6).optional(),
    maxValue: z.number().min(0).max(6).optional(),
    minStudents: z.number().min(1).optional(),
    maxStudents: z.number().min(1).optional(),
}).refine((data) => {
    // If prerequisite is selected, minValue is required
    if (data.criterionType === "prerequisite") {
        return data.minValue !== undefined && data.minValue !== null
    }
    return true
}, {
    message: "Minimum value is required for Required Minimum criterion",
    path: ["minValue"],
}).refine((data) => {
    // If maximize (Maximum Limit) is selected, maxValue is required
    if (data.criterionType === "maximize") {
        return data.maxValue !== undefined && data.maxValue !== null
    }
    return true
}, {
    message: "Maximum value is required for Maximum Limit criterion",
    path: ["maxValue"],
})

export type CategoryFormValues = z.infer<typeof formSchema>

export default function CategoryForm({
    initialValues,
    onSubmit,
    mode,
}: {
    initialValues?: Partial<CategoryFormValues>
    onSubmit: (values: CategoryFormValues) => void | Promise<void>
    mode?: "minimize" | "constraint" | null
}) {
    const [selectedCriterionType, setSelectedCriterionType] = React.useState<CategoryFormValues["criterionType"] | undefined>(
        initialValues?.criterionType ?? (mode === "minimize" ? "minimize" : undefined)
    )

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialValues?.name ?? "",
            description: initialValues?.description ?? "",
            criterionType: initialValues?.criterionType ?? (mode === "minimize" ? "minimize" : undefined),
            minValue: initialValues?.minValue,
            maxValue: initialValues?.maxValue,
            minStudents: initialValues?.minStudents,
            maxStudents: initialValues?.maxStudents,
        },
    })

    async function handleSubmit(values: CategoryFormValues) {
        try {
            await onSubmit(values)
        } catch (error) {
            console.error("Form submission error", error)
            toast.error("Failed to submit the form. Please try again.")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {mode === "minimize" && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Balanced Distribution Criterion
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            This criterion helps ensure students are evenly distributed across groups based on
                            a specific characteristic (e.g., gender, experience level, programming background).
                            The algorithm will try to balance this characteristic across all formed groups.
                        </p>
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={mode === "minimize"
                                        ? "e.g., Gender, Experience Level, Programming Background"
                                        : "e.g., Technical Skills, Soft Skills"}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                {mode === "minimize"
                                    ? "A short name for this balanced distribution criterion (e.g., \"Gender\", \"Experience Level\")"
                                    : "A short name for this category (e.g., \"Technical Skills\")"}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {mode !== "minimize" && (
                    <>
                        <FormField
                            control={form.control}
                            name="criterionType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Criterion Type <span className="text-red-500">*</span></FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={(value) => {
                                            const typedValue = value as "prerequisite" | "maximize" | "minimize" | "pull" | "push"
                                            field.onChange(typedValue)
                                            setSelectedCriterionType(typedValue)
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select criterion type..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="prerequisite" textValue="Required Minimum">
                                                <div className="flex flex-col py-1 text-left">
                                                    <span className="font-medium">Required Minimum</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Require a minimum value, optionally for a minimum count
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="maximize" textValue="Maximum Limit">
                                                <div className="flex flex-col py-1 text-left">
                                                    <span className="font-medium">Maximum Limit</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Cap the value, optionally with a maximum count
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="minimize" textValue="Balance Evenly">
                                                <div className="flex flex-col py-1 text-left">
                                                    <span className="font-medium">Balance Evenly</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Distribute students evenly across all groups
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pull" textValue="Maximize Together">
                                                <div className="flex flex-col py-1 text-left">
                                                    <span className="font-medium">Maximize Together</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Try to group students with this trait together
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="push" textValue="Minimize Together">
                                                <div className="flex flex-col py-1 text-left">
                                                    <span className="font-medium">Minimize Together</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Try to spread students with this trait apart
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedCriterionType === "prerequisite" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="minValue"
                                    render={({ field: minField }) => (
                                        <FormItem>
                                            <FormLabel>Minimum Value (0-6) <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="6"
                                                    step="0.1"
                                                    placeholder="Enter minimum value..."
                                                    {...minField}
                                                    onChange={(e) => {
                                                        const value = e.target.value === "" ? undefined : Number(e.target.value)
                                                        minField.onChange(value)
                                                    }}
                                                    value={minField.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="minStudents"
                                    render={({ field: minField }) => (
                                        <FormItem>
                                            <FormLabel>Minimum Students per Group (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Enter minimum count..."
                                                    {...minField}
                                                    onChange={(e) => {
                                                        const value = e.target.value === "" ? undefined : Number(e.target.value)
                                                        minField.onChange(value)
                                                    }}
                                                    value={minField.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {selectedCriterionType === "maximize" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="maxValue"
                                    render={({ field: maxField }) => (
                                        <FormItem>
                                            <FormLabel>Maximum Value (0-6) <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="6"
                                                    step="0.1"
                                                    placeholder="Enter maximum value..."
                                                    {...maxField}
                                                    onChange={(e) => {
                                                        const value = e.target.value === "" ? undefined : Number(e.target.value)
                                                        maxField.onChange(value)
                                                    }}
                                                    value={maxField.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="maxStudents"
                                    render={({ field: maxField }) => (
                                        <FormItem>
                                            <FormLabel>Maximum Students per Group (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Enter maximum count..."
                                                    {...maxField}
                                                    onChange={(e) => {
                                                        const value = e.target.value === "" ? undefined : Number(e.target.value)
                                                        maxField.onChange(value)
                                                    }}
                                                    value={maxField.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                    </>
                )}


                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={mode === "minimize"
                                        ? "e.g., Ensures gender diversity is balanced across all groups"
                                        : "Optional description for this category"}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Save Category</Button>
            </form>
        </Form>
    )
}
