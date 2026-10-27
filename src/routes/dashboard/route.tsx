import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { AppShell, ShellLink, SignOutButton } from "@/components/app-shell"

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" })
    }
    if (context.user.status !== "ACTIVE") {
      throw redirect({ to: "/account-status" })
    }
    return { user: context.user }
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
          <ShellLink to="/dashboard/chat">Chat</ShellLink>
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
