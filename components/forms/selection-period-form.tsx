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
    topicIds: z.array(z.string()).min(1, "Select at least one topic"),
    minimizeCategoryIds: z.array(z.string()).optional(),
    rankingsEnabled: z.boolean(),
    accessMode: z.enum(["code", "student_id"]),
}).refine((data) => data.end_deadline > data.start_deadline, {
    message: "End date must be after start date",
    path: ["end_deadline"],
});

export type SelectionPeriodFormValues = z.infer<typeof formSchema>

export interface TopicOption {
    id: string
    title: string
    description: string
}

export interface CategoryOption {
    id: string
    name: string
    description?: string
}

export default function SelectionPeriodForm({
    topics = [],
    categories = [],
    initialValues,
    onSubmit,
}: {
    topics?: readonly TopicOption[]
    categories?: readonly CategoryOption[]
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
            topicIds: initialValues?.topicIds ?? [],
            minimizeCategoryIds: initialValues?.minimizeCategoryIds ?? [],
            rankingsEnabled: initialValues?.rankingsEnabled ?? true,
            accessMode: initialValues?.accessMode ?? "code",
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
            topicIds: initialValues.topicIds,
            rankingsEnabled: initialValues.rankingsEnabled,
            accessMode: initialValues.accessMode,
        })
        return key
    }, [initialValues])

    useEffect(() => {
        if (initialValues) {
            const startDate = initialValues.start_deadline ?? new Date()
            const endDate = initialValues.end_deadline ?? getDefaultEndDate(startDate)

            form.reset({
                title: initialValues.title ?? "",
                selection_period_id: initialValues.selection_period_id ?? "",
                start_deadline: startDate,
                end_deadline: endDate,
                topicIds: initialValues.topicIds ?? [],
                minimizeCategoryIds: initialValues.minimizeCategoryIds ?? [],
                rankingsEnabled: initialValues.rankingsEnabled ?? true,
                accessMode: initialValues.accessMode ?? "code",
            })
        }
    }, [initialValuesKey, form])

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

    const topicIds = useWatch({ control: form.control, name: "topicIds" })
    const minimizeCategoryIds = useWatch({ control: form.control, name: "minimizeCategoryIds" })
    const semesterId = useWatch({ control: form.control, name: "selection_period_id" })

    // Filter topics by selected semester (if semesterId is provided)
    const filteredTopics = useMemo(() => {
        if (!semesterId) return topics
        // Filter topics by semesterId - but topics don't have semesterId in TopicOption
        // For now, show all topics since the VM will filter them when editing
        return topics
    }, [topics, semesterId])

    const toggleTopic = (topicId: string) => {
        const current = form.getValues("topicIds")
        const next = current.includes(topicId)
            ? current.filter((id: string) => id !== topicId)
            : [...current, topicId]
        form.setValue("topicIds", next)
    }

    const toggleCategory = (categoryId: string) => {
        const current = form.getValues("minimizeCategoryIds") ?? []
        const next = current.includes(categoryId)
            ? current.filter((id: string) => id !== categoryId)
            : [...current, categoryId]
        form.setValue("minimizeCategoryIds", next)
    }

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

                <FormField
                    control={form.control}
                    name="rankingsEnabled"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable topic rankings</FormLabel>
                                <FormDescription>
                                    When disabled, students can view topics but cannot rank them.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="accessMode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Access Mode</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select access mode" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="code">Access Codes (teacher generates codes)</SelectItem>
                                    <SelectItem value="student_id">Student ID (students enter their own ID)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Code mode requires pre-generated codes. Student ID mode lets students enter any ID.
                            </FormDescription>
                        </FormItem>
                    )}
                />

                {/* Topics Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Topics</Label>
                            <p className="text-sm text-muted-foreground">
                                Select topics available for this project assignment.
                                {topicIds.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">{topicIds.length} selected</Badge>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="h-[200px] overflow-y-auto scrollbar-hide rounded-md border p-2">
                        {filteredTopics.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                {!semesterId 
                                    ? "Enter a Semester ID first to see available topics."
                                    : "No topics available for this semester. Create topics in the Topics tab first."}
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {filteredTopics.map((topic) => {
                                    const isChecked = topicIds?.includes(topic.id)
                                    return (
                                        <label
                                            key={topic.id}
                                            htmlFor={`sp-topic-${topic.id}`}
                                            className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                id={`sp-topic-${topic.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleTopic(topic.id)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none line-clamp-2">
                                                    {topic.title}
                                                </p>
                                                {topic.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {topic.description}
                                                    </p>
                                                )}
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Balance Distribution Categories Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Balance Distribution (Optional)</Label>
                            <p className="text-sm text-muted-foreground">
                                Select categories to balance evenly across all groups in this project assignment.
                                {minimizeCategoryIds && minimizeCategoryIds.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">{minimizeCategoryIds.length} selected</Badge>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="max-h-[200px] overflow-y-auto scrollbar-hide rounded-md border p-2">
                        {categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                No balance distribution categories available. Create categories with "Balance Evenly" criterion in the Questionnaires tab first.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {categories.map((category) => {
                                    const isChecked = minimizeCategoryIds?.includes(category.id)
                                    return (
                                        <label
                                            key={category.id}
                                            htmlFor={`sp-category-${category.id}`}
                                            className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                id={`sp-category-${category.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleCategory(category.id)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {category.name}
                                                </p>
                                                {category.description && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {category.description}
                                                    </p>
                                                )}
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