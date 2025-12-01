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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

const formSchema = z.object({
    question: z.string().min(3, "Question must be at least 3 characters"),
    kind: z.enum(["boolean", "0to10"]),
})

export type QuestionFormValues = z.infer<typeof formSchema>

export default function QuestionForm({
    initialValues,
    onSubmit,
}: {
    initialValues?: Partial<QuestionFormValues>
    onSubmit: (values: QuestionFormValues) => void | Promise<void>
}) {
    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            question: initialValues?.question ?? "",
            kind: initialValues?.kind ?? "boolean",
        },
    })

    async function handleSubmit(values: QuestionFormValues) {
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
                    name="question"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Question</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter your question"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>The question text shown to students.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select question type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="boolean">Yes / No</SelectItem>
                                    <SelectItem value="0to10">Scale (0-10)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>Boolean for yes/no, 0-10 for rating scale.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Save Question</Button>
            </form>
        </Form>
    )
}
