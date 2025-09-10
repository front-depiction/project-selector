import { ReactNode } from "react"
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/shadcn-io/dock"

interface DockLayoutProps {
  children: ReactNode
  dockItems: Array<{
    id: string
    icon: ReactNode
    label: string
    isActive?: boolean
    onClick: () => void
  }>
}

export default function DockLayout({ children, dockItems }: DockLayoutProps) {
  return (
    <div className="min-h-screen relative">
      {/* Main content */}
      <div className="pb-24">
        {children}
      </div>

      {/* Fixed dock at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-4 flex justify-center">
        <Dock
          magnification={60}
          distance={100}
          className="backdrop-blur-md border"
        >
          {dockItems.map((item) => (
            <DockItem key={item.id} onClick={item.onClick}>
              <DockIcon>{item.icon}</DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          ))}
        </Dock>
      </div>
    </div>
  )
}