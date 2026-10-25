import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"
import { isPostList, isSessionUser } from "@/lib/records"
import { getTreaty } from "../../api.$"

const issueKinds = ["BAN", "SUSPEND", "LOCK"] as const

export type AdminIssue = {
  id: string
  kind: (typeof issueKinds)[number]
  reason: string
  startsAt: string
  endsAt: string | null
  resolvedAt: string | null
  createdAt: string
}

function isIssue(data: unknown): data is AdminIssue {
  if (typeof data !== "object" || data === null) {
    return false
  }
  if (!("id" in data) || typeof data.id !== "string") {
    return false
  }
  if (!("kind" in data) || typeof data.kind !== "string") {
    return false
  }
  if (!("reason" in data) || typeof data.reason !== "string") {
    return false
  }
  return issueKinds.includes(data.kind as AdminIssue["kind"])
}

export const Route = createFileRoute("/admin/users/$userId")({
  beforeLoad: async ({ params }) => {
    const { api } = await getTreaty()
    const result = await api.admin.users({ userId: params.userId }).get()
    if (
      result.error ||
      typeof result.data !== "object" ||
      !("user" in result.data) ||
      !isSessionUser(result.data.user) ||
      !("posts" in result.data) ||
      !isPostList(result.data.posts) ||
      !("issues" in result.data) ||
      !Array.isArray(result.data.issues)
    ) {
      throw redirect({ to: "/admin/users" })
    }
    return {
      detail: {
        user: result.data.user,
        posts: result.data.posts,
        issues: result.data.issues.filter(isIssue),
      },
    }
  },
  component: UserLayout,
})

const links = [
  { to: "/admin/users/$userId/roles", label: "Manage Roles" },
  { to: "/admin/users/$userId/password", label: "Manage passwords" },
  { to: "/admin/users/$userId/posts", label: "Posts posted" },
  { to: "/admin/users/$userId/issues", label: "Account Issues" },
] as const

function UserLayout() {
  const { detail } = Route.useRouteContext()
  const { user } = detail

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-1 rounded-2xl border border-border bg-background p-2">
        <p className="px-3 py-2 text-sm font-medium">
          {user.fname} {user.lname}
        </p>
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          {user.status} · {user.role}
        </p>
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            params={{ userId: user.id }}
            className="rounded-2xl px-3 py-2 text-sm hover:bg-muted"
            activeProps={{
              className: "bg-muted rounded-2xl px-3 py-2 text-sm font-medium",
            }}
          >
            {link.label}
          </Link>
        ))}
      </aside>
      <Outlet />
    </div>
  )
}
