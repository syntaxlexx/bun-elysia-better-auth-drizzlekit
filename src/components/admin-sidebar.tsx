import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router"
import { FileText, LayoutDashboard, LogOut, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/records"
import { signOut } from "@/lib/auth-client"

const navItems = [
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    fuzzy: true,
  },
  {
    to: "/admin/posts",
    label: "All posts",
    icon: FileText,
    fuzzy: true,
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    fuzzy: false,
  },
] as const satisfies ReadonlyArray<{
  to: "/admin/users" | "/admin/posts" | "/dashboard"
  label: string
  icon: LucideIcon
  fuzzy: boolean
}>

export function AdminSidebar({ user }: { user: SessionUser }) {
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()

  async function logout() {
    await signOut()
    await navigate({ to: "/" })
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">Admin</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.fname} {user.lname}
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={Boolean(
                      matchRoute({ to: item.to, fuzzy: item.fuzzy })
                    )}
                    render={<Link to={item.to} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log out" onClick={() => void logout()}>
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
