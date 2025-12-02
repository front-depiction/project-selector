"use client"
import {
    useState
} from "react"
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
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
    title: z.string().min(1).min(3),
    description: z.string().min(10),
    selection_period_id: z.string(),
    requiresAllowList: z.boolean().optional()
});

export type TopicFormValues = z.infer<typeof formSchema>

export default function TopicForm({
    periods,
    initialValues,
    onSubmit,
}: {
    periods: { value: string; label: string; id?: string }[]
    initialValues?: Partial<TopicFormValues>
    onSubmit: (values: TopicFormValues) => void
}) {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialValues?.title ?? "",
            description: initialValues?.description ?? "",
            selection_period_id: initialValues?.selection_period_id ?? "",
            requiresAllowList: initialValues?.requiresAllowList ?? false,
        }
    })

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        try {
            onSubmit(values)
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to submit the form. Please try again.");
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
                    name="selection_period_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Select Period</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a period to link" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {periods.map((p, index) => (
                                        <SelectItem key={p.id || p.value || `period-${index}`} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>The selection period Id to associate this topic to</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="requiresAllowList"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Require Allow-List</FormLabel>
                                <FormDescription>
                                    Only students on the allow-list can see and select this topic
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value ?? false}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    )
}