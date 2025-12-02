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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().optional(),
    questionIds: z.array(z.string()),
})

export type TemplateFormValues = z.infer<typeof formSchema>

export interface QuestionOption {
    id: string
    questionText: string
    kindDisplay: string
    kindVariant: "secondary" | "outline"
}

export default function TemplateForm({
    questions,
    initialValues,
    onSubmit,
}: {
    questions: readonly QuestionOption[]
    initialValues?: Partial<TemplateFormValues>
    onSubmit: (values: TemplateFormValues) => void | Promise<void>
}) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialValues?.title ?? "",
            description: initialValues?.description ?? "",
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

    async function handleSubmit(values: z.infer<typeof formSchema>) {
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
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Default Survey" {...field} />
                            </FormControl>
                            <FormDescription>A short name for this template.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Optional description..."
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>Describe what this template is used for.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <Label>Questions</Label>
                    <p className="text-sm text-muted-foreground">
                        Select questions to include in this template.
                        {questionIds.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{questionIds.length} selected</Badge>
                        )}
                    </p>
                    <div className="h-[300px] overflow-y-auto scrollbar-hide">
                        {questions.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                No questions available. Create some first.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {questions.map((q) => {
                                    const isChecked = questionIds.includes(q.id)
                                    return (
                                        <label
                                            key={q.id}
                                            htmlFor={`q-${q.id}`}
                                            className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                id={`q-${q.id}`}
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

                <Button type="submit">Save Template</Button>
            </form>
        </Form>
    )
}
