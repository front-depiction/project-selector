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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import {
    Upload,
    X,
    Plus,
    FileSpreadsheet,
    Users,
    Loader2,
    CheckCircle2,
    Info
} from "lucide-react"
import * as XLSX from "xlsx"

const formSchema = z.object({
    title: z.string().min(1).min(3),
    description: z.string().min(10),
    selection_period_id: z.string(),
});

export type TopicFormValues = z.infer<typeof formSchema> & {
    emails?: string[]
}

/**
 * Parse emails from file content (CSV or Excel)
 */
function parseEmails(content: string | ArrayBuffer, fileName: string): string[] {
    const emails: string[] = []

    if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
        // Parse CSV/TXT
        const text = typeof content === "string" ? content : new TextDecoder().decode(content)
        const lines = text.split(/[\r\n]+/)

        for (const line of lines) {
            // Split by comma, semicolon, tab, or whitespace
            const parts = line.split(/[,;\t\s]+/)
            for (const part of parts) {
                const trimmed = part.trim().toLowerCase()
                if (trimmed && trimmed.includes("@")) {
                    emails.push(trimmed)
                }
            }
        }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // Parse Excel
        const workbook = XLSX.read(content, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 })

        for (const row of data) {
            if (Array.isArray(row)) {
                for (const cell of row) {
                    if (typeof cell === "string") {
                        const trimmed = cell.trim().toLowerCase()
                        if (trimmed && trimmed.includes("@")) {
                            emails.push(trimmed)
                        }
                    }
                }
            }
        }
    }

    // Remove duplicates
    return [...new Set(emails)]
}

interface TopicFormProps {
    periods: { value: string; label: string; id?: string }[]
    initialValues?: Partial<TopicFormValues>
    initialEmails?: string[]
    onSubmit: (values: TopicFormValues) => void
    isEditing?: boolean
}

export default function TopicForm({
    periods,
    initialValues,
    initialEmails = [],
    onSubmit,
    isEditing = false,
}: TopicFormProps) {
    const [emails, setEmails] = React.useState<string[]>(initialEmails)
    const [newEmail, setNewEmail] = React.useState("")
    const [isImporting, setIsImporting] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialValues?.title ?? "",
            description: initialValues?.description ?? "",
            selection_period_id: initialValues?.selection_period_id ?? "",
        }
    })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)

        try {
            const buffer = await file.arrayBuffer()
            const parsedEmails = parseEmails(buffer, file.name)

            if (parsedEmails.length === 0) {
                toast.error("No valid email addresses found in file")
                setIsImporting(false)
                return
            }

            // Merge with existing emails, removing duplicates
            const newEmails = [...new Set([...emails, ...parsedEmails])]
            const addedCount = newEmails.length - emails.length
            setEmails(newEmails)
            
            toast.success(`Imported ${addedCount} new emails (${parsedEmails.length} found in file)`)
        } catch (error) {
            console.error("Import error:", error)
            toast.error("Failed to import emails")
        } finally {
            setIsImporting(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleAddEmail = () => {
        if (!newEmail.trim()) return
        
        const normalizedEmail = newEmail.trim().toLowerCase()
        if (!normalizedEmail.includes("@")) {
            toast.error("Please enter a valid email address")
            return
        }
        
        if (emails.includes(normalizedEmail)) {
            toast.error("Email already in list")
            return
        }
        
        setEmails([...emails, normalizedEmail])
        setNewEmail("")
    }

    const handleRemoveEmail = (email: string) => {
        setEmails(emails.filter(e => e !== email))
    }

    const handleClearAll = () => {
        if (confirm("Are you sure you want to remove all emails?")) {
            setEmails([])
        }
    }

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        try {
            // Include emails with the form values
            onSubmit({
                ...values,
                emails: emails,
            })
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to submit the form. Please try again.");
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full py-6">
                {/* Topic Details */}
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
                            <FormDescription>The selection period to associate this topic to</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Student Access - Email Allow List */}
                <Card className="border-dashed">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-base">Student Access</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {emails.length} students
                            </Badge>
                        </div>
                        <CardDescription>
                            Only students whose emails are listed below can see and select this topic
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Info Banner */}
                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Import student emails from a CSV or Excel file, or add them manually. 
                                Students not on this list will not be able to see this topic.
                            </p>
                        </div>

                        {/* File Import Section */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Import from File</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    disabled={isImporting}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                >
                                    {isImporting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Supports CSV, TXT, and Excel files (.xlsx, .xls)
                            </p>
                        </div>

                        {/* Add Single Email */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Add Email Manually</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="email"
                                    placeholder="student@university.edu"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            handleAddEmail()
                                        }
                                    }}
                                />
                                <Button type="button" size="icon" onClick={handleAddEmail}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Current Email List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Student Emails ({emails.length})</Label>
                                {emails.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive h-7 text-xs"
                                        onClick={handleClearAll}
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </div>

                            {emails.length > 0 ? (
                                <ScrollArea className="h-[150px] rounded-md border">
                                    <div className="p-2 space-y-1">
                                        {emails.map((email) => (
                                            <div
                                                key={email}
                                                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                                            >
                                                <span className="text-sm truncate">{email}</span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleRemoveEmail(email)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border rounded-md border-dashed">
                                    <FileSpreadsheet className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">No students added yet</p>
                                    <p className="text-xs">Import a file or add emails manually</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full">
                    {isEditing ? "Save Changes" : "Create Topic"}
                </Button>
            </form>
        </Form>
    )
}
