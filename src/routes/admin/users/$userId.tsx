import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { adminUserQuery } from "@/lib/queries/users"

export const Route = createFileRoute("/admin/users/$userId")({
  loader: ({ context, params }) =>
    context.queryClient.query(adminUserQuery(params.userId)),
  component: UserLayout,
})

const links = [
  { to: "/admin/users/$userId/roles", label: "Manage Roles" },
  { to: "/admin/users/$userId/password", label: "Manage passwords" },
  { to: "/admin/users/$userId/posts", label: "Posts posted" },
  { to: "/admin/users/$userId/issues", label: "Account Issues" },
] as const

function UserLayout() {
  const { userId } = Route.useParams()
  const { data } = useSuspenseQuery(adminUserQuery(userId))
  const { user } = data

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
