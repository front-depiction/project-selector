"use client"
import { toast } from "sonner"
import { useForm, useWatch } from "react-hook-form"
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
    isActive: z.boolean(),
    questionIds: z.array(z.string()),
});

export type SelectionPeriodFormValues = z.infer<typeof formSchema>

export interface QuestionOption {
    id: string
    questionText: string
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
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialValues?.title ?? "",
            selection_period_id: initialValues?.selection_period_id ?? "",
            start_deadline: initialValues?.start_deadline ?? new Date(),
            end_deadline: initialValues?.end_deadline ?? new Date(),
            isActive: initialValues?.isActive ?? false,
            questionIds: initialValues?.questionIds ?? [],
        },
    })

    const questionIds = useWatch({ control: form.control, name: "questionIds" })

    const toggleQuestion = (id: string) => {
        const currentIds = form.getValues("questionIds")
        const newIds = currentIds.includes(id)
            ? currentIds.filter(qid => qid !== id)
            : [...currentIds, id]
        form.setValue("questionIds", newIds)
    }

    const importTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId)
        if (template) {
            const currentIds = form.getValues("questionIds")
            const newIds = [...new Set([...currentIds, ...template.questionIds])]
            form.setValue("questionIds", newIds)
        }
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
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Mark as active</FormLabel>
                                <FormDescription>If active, students can immediately start selecting topics</FormDescription>
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

                {/* Questions Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base">Questions</Label>
                            <p className="text-sm text-muted-foreground">
                                Select questions students will answer during this project assignment.
                                {questionIds.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">{questionIds.length} selected</Badge>
                                )}
                            </p>
                        </div>
                        {templates.length > 0 && (
                            <Select
                                value={
                                    // Only show template as selected if ALL its questions are checked
                                    templates.find(t =>
                                        t.questionIds.length > 0 &&
                                        t.questionIds.every(qId => questionIds.includes(qId))
                                    )?.id ?? ""
                                }
                                onValueChange={importTemplate}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <FileDown className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Import from template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.title} ({t.questionIds.length})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="h-[200px] overflow-y-auto scrollbar-hide rounded-md border p-2">
                        {questions.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                No questions available. Create some in the Questionnaires tab first.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {questions.map((q) => {
                                    const isChecked = questionIds.includes(q.id)
                                    return (
                                        <label
                                            key={q.id}
                                            htmlFor={`sp-q-${q.id}`}
                                            className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                id={`sp-q-${q.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleQuestion(q.id)}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none line-clamp-2">
                                                    {q.questionText}
                                                </p>
                                                <Badge variant={q.kindVariant} className="text-xs">
                                                    {q.kindDisplay}
                                                </Badge>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <Button type="submit">Submit</Button>
            </form>
        </Form>
    )
}