"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Calendar,
  FileText,
  Users,
  ClipboardList,
  Settings,
  BarChart3,
  LayoutDashboard,
  CheckCircle2,
  ArrowRight,
  Info,
  AlertCircle,
  Lightbulb,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export const HelpView: React.FC = () => {
  const steps = [
    {
      number: 1,
      title: "Create Questionnaires",
      description: "Set up questions that students will answer to help with matching",
      icon: ClipboardList,
      details: [
        "Navigate to Questionnaires",
        "Create questions that assess student qualities (e.g., skills, preferences)",
        "Questions can be boolean (yes/no) or rating scales (0-6)",
        "Organize questions by categories for better analysis",
      ],
      location: "Questionnaires",
    },
    {
      number: 2,
      title: "Create Project Assignment",
      description: "Set up a new project assignment period, generate access codes, and distribute names",
      icon: Calendar,
      details: [
        "Go to Project Assignments",
        "Click 'Create Project Assignment'",
        "Set the open date (when students can start selecting)",
        "Set the close date (when selections close)",
        "Select which questions to include in this assignment",
        "Click 'Apply' to create the period",
        "In the Project Assignment, click the dropdown menu (three dots)",
        "Select 'Manage Access Codes'",
        "Enter the number of students and click 'Generate Codes'",
        "Download the CSV file with all codes",
        "Add student names to the CSV and import them back (optional but recommended)",
        "Distribute the access codes (and names if added) to students",
      ],
      location: "Project Assignments → Manage Access Codes",
    },
    {
      number: 3,
      title: "Create Topics and Apply to Project Assignment",
      description: "Define the project topics that students can choose from and ensure they're available",
      icon: FileText,
      details: [
        "Go to the Topics section",
        "Click 'Create Topic' to add a new project topic",
        "Provide a title and description for each topic",
        "Topics can be activated or deactivated as needed",
        "Ensure topics are active and belong to the same semester as your project assignment",
        "Topics will automatically be available to students in the assignment period",
      ],
      location: "Topics",
    },
    {
      number: 4,
      title: "Students Complete Questionnaires",
      description: "Students log in and answer the questionnaire",
      icon: ClipboardList,
      details: [
        "Students visit the student portal",
        "Enter their access code",
        "Complete the questionnaire with all required questions",
        "Submit their responses",
      ],
      location: "Student Portal",
    },
    {
      number: 5,
      title: "Students Rank Topics",
      description: "Students select and rank their preferred topics",
      icon: FileText,
      details: [
        "After completing the questionnaire, students see available topics",
        "They select topics and rank them by preference",
        "Students can change their rankings until the close date",
      ],
      location: "Student Portal",
    },
    {
      number: 6,
      title: "Close Period & Assign Groups",
      description: "Once the period closes, assign students to topics using the algorithm",
      icon: CheckCircle2,
      details: [
        "Wait for the close date to pass, or manually close the period",
        "In Project Assignments, click the dropdown menu for the period",
        "Select 'Assign Now' to run the assignment algorithm",
        "The system will optimally assign students to topics based on preferences and constraints",
        "You can view the results immediately",
      ],
      location: "Project Assignments → Assign Now",
    },
    {
      number: 7,
      title: "View Results & Analytics",
      description: "Review assignments, statistics, and group compositions",
      icon: BarChart3,
      details: [
        "View assignments in the Overview section",
        "See topics with their assigned student groups",
        "Check match rates and statistics",
        "Use Analytics for detailed reports and insights",
      ],
      location: "Overview / Analytics",
    },
  ]

  const quickTips = [
    {
      icon: AlertCircle,
      title: "Period Statuses",
      content: (
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <Badge className="bg-blue-600 text-white mr-2">Inactive</Badge>
            Period hasn't started yet
          </li>
          <li>
            <Badge className="bg-green-600 text-white mr-2">Open</Badge>
            Students can currently make selections
          </li>
          <li>
            <Badge className="bg-red-600 text-white mr-2">Closed</Badge>
            Selections are closed, ready for assignment
          </li>
          <li>
            <Badge className="bg-purple-600 text-white mr-2">Assigned</Badge>
            Students have been assigned to topics
          </li>
        </ul>
      ),
    },
    {
      icon: Lightbulb,
      title: "Best Practices",
      content: (
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Create topics before creating project assignments</li>
          <li>Set close dates at least a few days after open dates</li>
          <li>Generate access codes early and distribute them to students</li>
          <li>Remind students to complete questionnaires before ranking topics</li>
          <li>Review assignments before sharing results with students</li>
        </ul>
      ),
    },
    {
      icon: Info,
      title: "Student Names (GDPR Compliant)",
      content: (
        <div className="text-sm space-y-2">
          <p>
            Student names are optional and only stored if you explicitly provide them.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Download the CSV with access codes</li>
            <li>Add student names to the CSV file</li>
            <li>Import the CSV back to link names to codes</li>
            <li>Names will then display throughout the system</li>
            <li>You can also edit names directly in the access codes manager</li>
          </ul>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Guide</h1>
        <p className="text-muted-foreground mt-2">
          Learn how to use the Project Assignment System step by step
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Follow these steps to set up and manage project assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              This system helps you manage student project assignments by allowing
              students to rank their preferred topics, then automatically assigning
              them to groups using an optimization algorithm.
            </p>
            <p>
              The process flows from creating topics and questionnaires, through
              student selection, to final group assignment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Guide */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Step-by-Step Process</h2>
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <Card key={step.number} className="relative">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-lg font-bold">{step.number}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                    <Badge variant="outline" className="mt-2">
                      {step.location}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 ml-14">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              {index < steps.length - 1 && (
                <div className="absolute left-5 top-16 bottom-0 w-0.5 bg-border" />
              )}
            </Card>
          )
        })}
      </div>

      <Separator />

      {/* Quick Tips */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Quick Reference</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickTips.map((tip, idx) => {
            const Icon = tip.icon
            return (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{tip.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>{tip.content}</CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Navigation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Guide</CardTitle>
          <CardDescription>
            What each section of the dashboard does
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <LayoutDashboard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Overview</h4>
                <p className="text-sm text-muted-foreground">
                  View statistics, metrics, and topic assignments with student groups
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Topics</h4>
                <p className="text-sm text-muted-foreground">
                  Create and manage project topics that students can choose from
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Project Assignments</h4>
                <p className="text-sm text-muted-foreground">
                  Create assignment periods, manage access codes, and assign students to groups
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Questionnaires</h4>
                <p className="text-sm text-muted-foreground">
                  Create and manage questions that students answer
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  View detailed analytics, reports, and topic popularity trends
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Students</h4>
                <p className="text-sm text-muted-foreground">
                  View student information and their assignment history
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Configure system settings and manage semesters
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
