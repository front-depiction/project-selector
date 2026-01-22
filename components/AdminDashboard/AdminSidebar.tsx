"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Settings,
  ClipboardList,
  GraduationCap,
  HelpCircle,
} from "lucide-react"
import { useSignals } from "@preact/signals-react/runtime"
import * as AD from "./index"
import { useSharedDashboardVM } from "./index"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Enable signals reactivity
  useSignals()

  const vm = useSharedDashboardVM()
  // Read from signal directly for reactivity (context value is not reactive)
  const activeView = vm.activeView$.value
  const setActiveView = vm.setActiveView

  const navigationItems = [
    {
      id: "overview" as AD.ViewType,
      title: "Overview",
      description: "Dashboard home",
      icon: LayoutDashboard,
    },
    {
      id: "topics" as AD.ViewType,
      title: "Topics",
      description: "Projects students choose",
      icon: FileText,
    },
    {
      id: "periods" as AD.ViewType,
      title: "Project Assignments",
      description: "Selection periods & results",
      icon: Calendar,
    },
    {
      id: "questionnaires" as AD.ViewType,
      title: "Questionnaires",
      description: "Student survey questions",
      icon: ClipboardList,
    },
    {
      id: "students" as AD.ViewType,
      title: "Students",
      description: "View student progress",
      icon: Users,
    },
    {
      id: "settings" as AD.ViewType,
      title: "Settings",
      description: "System configuration",
      icon: Settings,
    },
    {
      id: "help" as AD.ViewType,
      title: "Help",
      description: "How to use this app",
      icon: HelpCircle,
    },
  ]

  return (
    <Sidebar collapsible="icon" className="w-64" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm">Admin Dashboard</span>
            <span className="text-xs text-muted-foreground">Topic Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={item.description}
                    isActive={activeView === item.id}
                    onClick={() => setActiveView(item.id)}
                    className="h-auto py-2"
                  >
                    <item.icon className="shrink-0" />
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
