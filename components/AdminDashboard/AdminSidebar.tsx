"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  GraduationCap,
} from "lucide-react"
import { useSignals } from "@preact/signals-react/runtime"
import * as AD from "./index"

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

  const { activeView, setActiveView } = AD.useDashboard()

  const navigationItems = [
    {
      id: "overview" as AD.ViewType,
      title: "Overview",
      icon: LayoutDashboard,
      tooltip: "Dashboard overview and metrics",
    },
    {
      id: "topics" as AD.ViewType,
      title: "Topics",
      icon: FileText,
      tooltip: "Manage project topics",
    },
    {
      id: "periods" as AD.ViewType,
      title: "Project Assignments",
      icon: Calendar,
      tooltip: "Manage project assignment periods",
    },
    {
      id: "analytics" as AD.ViewType,
      title: "Analytics",
      icon: BarChart3,
      tooltip: "View analytics and reports",
    },
    {
      id: "questionnaires" as AD.ViewType,
      title: "Questionnaires",
      icon: ClipboardList,
      tooltip: "Manage questionnaires",
    },
    {
      id: "students" as AD.ViewType,
      title: "Students",
      icon: Users,
      tooltip: "Manage students",
    },
    {
      id: "settings" as AD.ViewType,
      title: "Settings",
      icon: Settings,
      tooltip: "Dashboard settings",
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
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
                    tooltip={item.tooltip}
                    isActive={activeView === item.id}
                    onClick={() => setActiveView(item.id)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
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
