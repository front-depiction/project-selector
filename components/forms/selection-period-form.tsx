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
    SmartDatetimeInput
} from "@/components/ui/smart-datetime-input"
import {
    Switch
} from "@/components/ui/switch"

const formSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    selection_period_id: z.string().min(1, "Selection period ID is required"),
    start_deadline: z.date(),
    end_deadline: z.date(),
    isActive: z.boolean()
});

export type SelectionPeriodFormValues = z.infer<typeof formSchema>

export default function SelectionPeriodForm({
    initialValues,
    onSubmit,
}: {
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
        },
    })

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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">

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
                                    <FormLabel>Selection Period Id</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="period1"

                                            type=""
                                            {...field} />
                                    </FormControl>
                                    <FormDescription>This is the identifier used when linking topics</FormDescription>
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
                                <FormLabel>Mark this period as active</FormLabel>
                                <FormDescription>If you mark this period as active, it will be immediately available to people</FormDescription>
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
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    )
}