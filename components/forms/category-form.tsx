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

const formSchema = z.object({
    name: z.string().min(1, "Category name is required").min(2, "Category name must be at least 2 characters"),
    description: z.string().optional(),
})

export type CategoryFormValues = z.infer<typeof formSchema>

export default function CategoryForm({
    initialValues,
    onSubmit,
}: {
    initialValues?: Partial<CategoryFormValues>
    onSubmit: (values: CategoryFormValues) => void | Promise<void>
}) {
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialValues?.name ?? "",
            description: initialValues?.description ?? "",
        },
    })

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
