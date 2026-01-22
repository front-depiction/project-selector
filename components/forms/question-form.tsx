"use client"
import * as React from "react"
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    question: z.string().min(3, "Question must be at least 3 characters"),
    kind: z.enum(["boolean", "0to6"]),
    characteristicName: z.string().min(1, "Please select a characteristic for this question"),
})

export type QuestionFormValues = z.infer<typeof formSchema>

export default function QuestionForm({
    initialValues,
    existingCharacteristicNames = [],
    onSubmit,
}: {
    initialValues?: Partial<QuestionFormValues>
    /** List of existing characteristic names to choose from */
    existingCharacteristicNames?: string[]
    onSubmit: (values: QuestionFormValues) => void | Promise<void>
}) {
    const [characteristicOpen, setCharacteristicOpen] = React.useState(false)

    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            question: initialValues?.question ?? "",
            kind: initialValues?.kind ?? "boolean",
            characteristicName: initialValues?.characteristicName ?? (existingCharacteristicNames.length > 0 ? existingCharacteristicNames[0] : ""),
        },
    })

    // Sort characteristic names alphabetically
    const sortedCharacteristicNames = React.useMemo(() => {
        return [...existingCharacteristicNames].sort()
    }, [existingCharacteristicNames])

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
                                    <SelectItem value="0to6">Scale (0-6)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>Boolean for yes/no, 0-6 for rating scale.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="characteristicName"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Characteristic <span className="text-red-500">*</span></FormLabel>
                            <Popover open={characteristicOpen} onOpenChange={setCharacteristicOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={characteristicOpen}
                                            className={cn(
                                                "w-full justify-between",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value || "Select characteristic"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search characteristics..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="p-4 text-center">
                                                    <p className="text-sm text-muted-foreground">
                                                        No characteristics found.
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Create a category in the Categories section below.
                                                    </p>
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {sortedCharacteristicNames.map((characteristicName) => (
                                                    <CommandItem
                                                        key={characteristicName}
                                                        value={characteristicName}
                                                        onSelect={() => {
                                                            form.setValue("characteristicName", characteristicName)
                                                            setCharacteristicOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                field.value === characteristicName ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {characteristicName}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                Every question must belong to a characteristic. Create categories in the Categories section first, then select one here.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Save Question</Button>
            </form>
        </Form>
    )
}
