"use client"
import { toast } from "sonner"
import { useForm, useWatch } from "react-hook-form"
import { useEffect, useMemo } from "react"
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
import { SmartDatetimeInput } from "@/components/ui/smart-datetime-input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { FileDown } from "lucide-react"

const formSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    selection_period_id: z.string().min(1, "Selection period ID is required"),
    start_deadline: z.date(),
    end_deadline: z.date(),
    // Under the hood we still store question IDs, but the teacher will only pick categories.
    questionIds: z.array(z.string()),
    categories: z.array(z.string()).min(1, "Select at least one category"),
}).refine((data) => data.end_deadline > data.start_deadline, {
    message: "End date must be after start date",
    path: ["end_deadline"],
});

export type SelectionPeriodFormValues = z.infer<typeof formSchema>

export interface QuestionOption {
    id: string
    questionText: string
    category: string
    kindDisplay: string
    kindVariant: "secondary" | "outline"
}

export interface TemplateOption {
    id: string
    title: string
    questionIds: string[]
}

export default function SelectionPeriodForm({
    questions = [],
    templates = [],
    initialValues,
    onSubmit,
}: {
    questions?: readonly QuestionOption[]
    templates?: readonly TemplateOption[]
    initialValues?: Partial<SelectionPeriodFormValues>
    onSubmit: (values: SelectionPeriodFormValues) => void | Promise<void>
}) {
    // Calculate default end date (3 days after start date)
    const getDefaultEndDate = (startDate: Date) => {
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 3)
        return endDate
    }

    const defaultStartDate = initialValues?.start_deadline ?? new Date()
    const defaultEndDate = initialValues?.end_deadline ?? getDefaultEndDate(defaultStartDate)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialValues?.title ?? "",
            selection_period_id: initialValues?.selection_period_id ?? "",
            start_deadline: defaultStartDate,
            end_deadline: defaultEndDate,
            questionIds: initialValues?.questionIds ?? [],
            categories: [],
        },
    })

    // Update form when initialValues change (e.g. when data is loaded asynchronously)
    // Create a stable serialized key to detect changes without varying dependency array size
    const initialValuesKey = useMemo(() => {
        if (!initialValues) return ""
        const key = JSON.stringify({
            title: initialValues.title,
            selection_period_id: initialValues.selection_period_id,
            start_deadline: initialValues.start_deadline?.getTime(),
            end_deadline: initialValues.end_deadline?.getTime(),
            questionIds: initialValues.questionIds,
        })
        console.log('[SelectionPeriodForm] initialValuesKey changed:', {
            questionIds: initialValues.questionIds,
            questionIdsLength: initialValues.questionIds?.length ?? 0
        })
        return key
    }, [initialValues])

    useEffect(() => {
        console.log('[SelectionPeriodForm] useEffect triggered', {
            hasInitialValues: !!initialValues,
            questionIds: initialValues?.questionIds,
            questionIdsLength: initialValues?.questionIds?.length ?? 0
        })
        if (initialValues) {
            const startDate = initialValues.start_deadline ?? new Date()
            const endDate = initialValues.end_deadline ?? getDefaultEndDate(startDate)
            // Derive categories from the initial question IDs, if any
            const initialCategorySet = new Set<string>()
            if (initialValues.questionIds && questions.length > 0) {
                for (const qId of initialValues.questionIds) {
                    const q = questions.find((q) => q.id === qId)
                    if (q?.category) initialCategorySet.add(q.category)
                }
            }

            form.reset({
                title: initialValues.title ?? "",
                selection_period_id: initialValues.selection_period_id ?? "",
                start_deadline: startDate,
                end_deadline: endDate,
                questionIds: initialValues.questionIds ?? [],
                categories: Array.from(initialCategorySet),
            })
            console.log('[SelectionPeriodForm] Form reset with questionIds:', initialValues.questionIds)
        }
    }, [initialValuesKey, form, questions])

    // Watch start_deadline and auto-update end_deadline if it becomes invalid
    const startDeadline = useWatch({ control: form.control, name: "start_deadline" })
    const endDeadline = useWatch({ control: form.control, name: "end_deadline" })

    useEffect(() => {
        if (startDeadline && endDeadline && endDeadline <= startDeadline) {
            // Auto-update end_deadline to be 3 days after start_deadline if it's invalid
            const newEndDate = getDefaultEndDate(startDeadline)
            form.setValue("end_deadline", newEndDate, { shouldValidate: true })
        }
    }, [startDeadline, endDeadline, form])

    const questionIds = useWatch({ control: form.control, name: "questionIds" })
    const selectedCategories = useWatch({ control: form.control, name: "categories" })

    // Build category options from questions
    const categoryOptions = useMemo(() => {
        const map = new Map<string, number>()
        for (const q of questions) {
            if (!q.category) continue
            map.set(q.category, (map.get(q.category) ?? 0) + 1)
        }
        return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
    }, [questions])

    const toggleCategory = (category: string) => {
        const current = form.getValues("categories")
        const next = current.includes(category)
            ? current.filter((c: string) => c !== category)
            : [...current, category]
        form.setValue("categories", next)
    }

    // Whenever selected categories change, automatically update questionIds to include
    // all questions from those categories.
    useEffect(() => {
        if (!selectedCategories) return
        const newIds = questions
            .filter((q) => selectedCategories.includes(q.category))
            .map((q) => q.id)
        form.setValue("questionIds", newIds, { shouldValidate: true })
    }, [selectedCategories, questions, form])

    async function handleSubmit(values: z.infer<typeof formSchema>) {
        try {
            await onSubmit(values)
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to submit the form. Please try again.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-3xl mx-auto max-h-[70vh] overflow-y-auto pr-2">

                <div className="grid grid-cols-12 gap-4">

                    <div className="col-span-6">

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Amazing Project"

                                            type="text"
                                            {...field} />
                                    </FormControl>
                                    <FormDescription>This is the description for your project topic</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="col-span-6">

                        <FormField
                            control={form.control}
                            name="selection_period_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Semester ID</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="2024-spring"

                                            type=""
                                            {...field} />
                                    </FormControl>
                                    <FormDescription>Identifier used to link topics to this assignment</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                </div>

                <FormField
                    control={form.control}
                    name="start_deadline"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>When should the selection process start?</FormLabel>
                            <FormControl>
                                <SmartDatetimeInput
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="e.g. Tomorrow morning 9am"
                                />
                            </FormControl>
                            <FormDescription>Please select the full time</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="end_deadline"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>When should the selection process end?</FormLabel>
                            <FormControl>
                                <SmartDatetimeInput
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="e.g. Tomorrow morning 9am"


                                />
                            </FormControl>
                            <FormDescription>Please select the full time</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                {/* Questions Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Question Categories</Label>
                            <p className="text-sm text-muted-foreground">
                                Select categories of questions students will answer during this project assignment.
                                {questionIds.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">{questionIds.length} selected</Badge>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="h-[200px] overflow-y-auto scrollbar-hide rounded-md border p-2">
                        {categoryOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                No categories available. Create categories and questions in the Questionnaires tab first.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {categoryOptions.map((cat) => {
                                    const isChecked = selectedCategories?.includes(cat.name)
                                    return (
                                        <label
                                            key={cat.name}
                                            htmlFor={`sp-cat-${cat.name}`}
                                            className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                id={`sp-cat-${cat.name}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleCategory(cat.name)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none line-clamp-2">
                                                    {cat.name}
                                                </p>
                                                <Badge variant="outline" className="text-xs">
                                                    {cat.count} question{cat.count === 1 ? "" : "s"}
                                                </Badge>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <Button type="submit">Apply</Button>
            </form>
        </Form>
    )
}