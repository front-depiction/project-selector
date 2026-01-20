"use client"
import * as React from "react"
import {
    toast
} from "sonner"
import {
    useForm
} from "react-hook-form"
import {
    zodResolver
} from "@hookform/resolvers/zod"
import {
    z
} from "zod"
import {
    cn
} from "@/lib/utils"
import {
    Button
} from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Input
} from "@/components/ui/input"
import {
    Textarea
} from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

const formSchema = z.object({
    title: z.string().min(1).min(3),
    description: z.string().min(10),
    constraintId: z.string().min(1, "Constraint is required"),
    duplicateCount: z.number().int().min(1).max(100),
});

export type TopicFormValues = z.infer<typeof formSchema>

export interface ConstraintOption {
    value: string
    label: string
    id?: string
}

export default function TopicForm({
    constraints,
    initialValues,
    onSubmit,
}: {
    constraints: ConstraintOption[]
    initialValues?: Partial<TopicFormValues>
    onSubmit: (values: TopicFormValues) => void | Promise<void>
}) {
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const form = useForm<TopicFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialValues?.title ?? "",
            description: initialValues?.description ?? "",
            constraintId: initialValues?.constraintId ?? "",
            duplicateCount: initialValues?.duplicateCount ?? 1,
        }
    })

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        if (isSubmitting) return

        try {
            setIsSubmitting(true)
            await onSubmit(values)
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to submit the form. Please try again.");
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 w-full py-10">

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Project Topic"
                                    className="w-full"
                                    type="text"
                                    {...field} />
                            </FormControl>
                            <FormDescription>This is the title of your topic</FormDescription>
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
                                    placeholder="Super advanced machine learning mega cool AI buzz words list"
                                    className="resize-none w-full"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>Description of your project topic</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="constraintId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Constraint *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a constraint" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {constraints.map((c, index) => {
                                        const uniqueKey = c.id
                                            ? `constraint-${c.id}`
                                            : `constraint-${c.value}-${index}`;

                                        return (
                                            <SelectItem key={uniqueKey} value={c.value}>
                                                {c.label}
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                            <FormDescription>The constraint to associate this topic with</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="duplicateCount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Copies</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    placeholder="1"
                                    className="w-full"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    value={field.value || 1}
                                />
                            </FormControl>
                            <FormDescription>
                                Create multiple copies of this topic (useful when one topic should be available for multiple groups)
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Submit"}
                </Button>
            </form>
        </Form>
    )
}