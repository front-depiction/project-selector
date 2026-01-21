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
import {
    Checkbox
} from "@/components/ui/checkbox"

const formSchema = z.object({
    title: z.string().min(1).min(3),
    description: z.string().min(10),
    constraintIds: z.array(z.string()).optional(),
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
            constraintIds: initialValues?.constraintIds ?? [],
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
                    name="constraintIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Topic-Specific Criteria (Optional)</FormLabel>
                            <FormDescription className="mb-2">
                                Select categories with prerequisites or maximization criteria for this topic.
                            </FormDescription>
                            <div className="max-h-[200px] overflow-y-auto rounded-md border p-2">
                                {constraints.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        No topic-specific categories available. Create categories in the Questionnaires tab first.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {constraints.map((c, index) => {
                                            const uniqueKey = c.id
                                                ? `constraint-${c.id}`
                                                : `constraint-${c.value}-${index}`;
                                            const isChecked = field.value?.includes(c.value) ?? false;

                                            return (
                                                <label
                                                    key={uniqueKey}
                                                    htmlFor={uniqueKey}
                                                    className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        id={uniqueKey}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked: boolean) => {
                                                            const current = field.value ?? [];
                                                            const next = checked
                                                                ? [...current, c.value]
                                                                : current.filter((id: string) => id !== c.value);
                                                            field.onChange(next);
                                                        }}
                                                    />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm font-medium leading-none">
                                                            {c.label}
                                                        </p>
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
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