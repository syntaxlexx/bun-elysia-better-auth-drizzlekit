import { Link, useNavigate } from "@tanstack/react-router"
import { LayoutDashboard, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SessionUser } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"

function initials(user: SessionUser) {
  return `${user.fname.slice(0, 1)}${user.lname.slice(0, 1)}`.toUpperCase()
}

export function AdminUserMenu({ user }: { user: SessionUser }) {
  const navigate = useNavigate()

  async function logout() {
    const { api } = await getTreaty()
    await api.auth.logout.post()
    await navigate({ to: "/" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
      >
        <Avatar>
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(user)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Open user menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">
                {user.fname} {user.lname}
              </span>
              <span className="truncate">
                {user.email ?? user.phone ?? user.role}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/dashboard" />}>
            <LayoutDashboard />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/dashboard/profile" />}>
            <User />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
