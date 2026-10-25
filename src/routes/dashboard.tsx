import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AppShell, ShellLink, SignOutButton } from "@/components/app-shell"
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "./api.$"

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (result.error || !isSessionUser(result.data)) {
      throw redirect({ to: "/login" })
    }
    if (result.data.status !== "ACTIVE") {
      throw redirect({ to: "/account-status" })
    }
    return { user: result.data }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { user } = Route.useRouteContext()

  return (
    <AppShell
      title="Dashboard"
      subtitle={`${user.fname} ${user.lname}`}
      nav={
        <>
          <ShellLink to="/dashboard" exact>
            Overview
          </ShellLink>
          <ShellLink to="/dashboard/posts">Posts</ShellLink>
          <ShellLink to="/dashboard/profile">Profile</ShellLink>
          <ShellLink to="/posts">Public posts</ShellLink>
          {user.role === "ADMIN" ? (
            <ShellLink to="/admin/users">Admin</ShellLink>
          ) : null}
          <SignOutButton />
        </>
      }
    >
      <Outlet />
    </AppShell>
  )
}
