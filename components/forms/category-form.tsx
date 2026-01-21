"use client"
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
    criterionType: z.enum(["prerequisite", "minimize", "pull"], {
        message: "Please select how this category should be used"
    }),
    minRatio: z.number().min(0).max(100).optional(),
    target: z.number().min(0).max(100).optional(),
}).refine((data) => {
    // If prerequisite is selected, minRatio is required
    if (data.criterionType === "prerequisite") {
        return data.minRatio !== undefined && data.minRatio !== null
    }
    return true
}, {
    message: "Minimum percentage is required for Required Minimum criterion",
    path: ["minRatio"],
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
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialValues?.name ?? "",
            description: initialValues?.description ?? "",
            criterionType: initialValues?.criterionType ?? (mode === "minimize" ? "minimize" : undefined),
            minRatio: initialValues?.minRatio,
            target: initialValues?.target,
        },
    })

    const selectedCriterionType = form.watch("criterionType")

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
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g., Technical Skills, Soft Skills"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A short name for this category (e.g., "Technical Skills")
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {mode !== "minimize" && (
                    <FormField
                        control={form.control}
                        name="criterionType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Criterion Type <span className="text-red-500">*</span></FormLabel>
                                <Select
                                    value={field.value}
                                    onValueChange={(value) => {
                                        field.onChange(value as "prerequisite" | "minimize" | "pull")
                                    }}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="How should this category be used when making groups?" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="prerequisite">
                                            <div className="flex flex-col py-1">
                                                <span className="font-medium">Required Minimum</span>
                                                <span className="text-xs text-muted-foreground">
                                                    Some students MUST have this skill in every group
                                                </span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="pull">
                                            <div className="flex flex-col py-1">
                                                <span className="font-medium">Maximize in Groups</span>
                                                <span className="text-xs text-muted-foreground">
                                                    Try to put students with lots of skill from this category together
                                                </span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    {selectedCriterionType === "prerequisite" && (
                                        <span className="text-sm">
                                            <strong>Example:</strong> If you need at least 40% of students in each group to speak French,
                                            pick this and enter 40. Students who don't speak French won't be put in groups that need it.
                                        </span>
                                    )}
                                    {selectedCriterionType === "pull" && (
                                        <span className="text-sm">
                                            <strong>Example:</strong> If you want groups with lots of leadership skills,
                                            this tries to put the best leaders together in each group.
                                        </span>
                                    )}
                                    {!selectedCriterionType && (
                                        <span className="text-sm">
                                            Pick how this category should be used when the computer makes groups for you.
                                        </span>
                                    )}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                

                {selectedCriterionType === "prerequisite" && (
                    <FormField
                        control={form.control}
                        name="minRatio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Minimum Percentage</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="e.g., 40"
                                        {...field}
                                        onChange={(e) => {
                                            const value = e.target.value === "" ? undefined : Number(e.target.value)
                                            field.onChange(value)
                                        }}
                                        value={field.value ?? ""}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter a number from 0 to 100. This tells the computer what percentage of students in each group
                                    must have this skill. For example, if you enter 40, at least 4 out of every 10 students in each group
                                    will have this skill.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}


                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Optional description for this category"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A brief description of what questions belong in this category
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Save Category</Button>
            </form>
        </Form>
    )
}
