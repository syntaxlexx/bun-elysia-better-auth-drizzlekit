import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AppShell, ShellLink, SignOutButton } from "@/components/app-shell"
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "./api.$"

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
    <AppShell
      title="Admin"
      subtitle={`${user.fname} ${user.lname}`}
      nav={
        <>
          <ShellLink to="/admin/users">Users</ShellLink>
          <ShellLink to="/admin/posts">All posts</ShellLink>
          <ShellLink to="/dashboard">Dashboard</ShellLink>
          <SignOutButton />
        </>
      }
    >
      <Outlet />
    </AppShell>
  )
}
