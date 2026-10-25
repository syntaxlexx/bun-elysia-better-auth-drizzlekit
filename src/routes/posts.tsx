import { createFileRoute, Outlet } from "@tanstack/react-router"
import { AppShell, ShellLink, SignOutButton } from "@/components/app-shell"
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "./api.$"

export const Route = createFileRoute("/posts")({
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    return {
      user: result.error || !isSessionUser(result.data) ? null : result.data,
    }
  },
  component: PostsLayout,
})

function PostsLayout() {
  const { user } = Route.useRouteContext()

  return (
    <AppShell
      title="Posts"
      subtitle="Published"
      nav={
        <>
          <ShellLink to="/posts" exact>
            All posts
          </ShellLink>
          {user?.status === "ACTIVE" ? (
            <ShellLink to="/dashboard">Dashboard</ShellLink>
          ) : null}
          {user ? <SignOutButton /> : <ShellLink to="/login">Log in</ShellLink>}
        </>
      }
    >
      <Outlet />
    </AppShell>
  )
}
