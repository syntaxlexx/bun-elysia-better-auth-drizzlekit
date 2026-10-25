import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminUserMenu } from "@/components/admin-user-menu"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "../api.$"

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (result.error || !isSessionUser(result.data)) {
      throw redirect({ to: "/login" })
    }
    if (result.data.status !== "ACTIVE") {
      throw redirect({ to: "/account-status" })
    }
    if (result.data.role !== "ADMIN") {
      throw redirect({ to: "/dashboard" })
    }
    return { user: result.data }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { user } = Route.useRouteContext()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar user={user} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <p className="text-sm font-medium">Admin</p>
            <div className="ml-auto flex items-center gap-1">
              <ThemeSwitcher />
              <AdminUserMenu user={user} />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
