import { useSuspenseQuery } from "@tanstack/react-query"
import { Paginator } from "@/components/paginator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminUsersQuery } from "@/lib/queries/users"
import { formatTime, pageFromSearch, perPageFromSearch } from "@/lib/records"
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router"
import type { SearchSchemaInput } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/users/")({
  validateSearch: (
    search: { page?: number; perPage?: number } & SearchSchemaInput
  ) => ({
    page: pageFromSearch(search.page),
    perPage: perPageFromSearch(search.perPage),
  }),
  search: {
    middlewares: [stripSearchParams({ page: 1, perPage: 10 })],
  },
  loaderDeps: ({ search }) => ({ page: search.page, perPage: search.perPage }),
  loader: ({ context, deps }) =>
    context.queryClient.query(adminUsersQuery(deps.page, deps.perPage)),
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const { page, perPage } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(adminUsersQuery(page, perPage))
  const users = data.items

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Phone</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="py-3 pr-3">
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: user.id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {user.fname} {user.lname}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{user.email}</td>
                  <td className="py-3 pr-3">{user.phone ?? "—"}</td>
                  <td className="py-3 pr-3">{user.role}</td>
                  <td className="py-3 pr-3">{user.status}</td>
                  <td className="py-3">{formatTime(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginator
          meta={data.meta}
          link={(next) => (
            <Link to="/admin/users" search={{ page: next, perPage }} />
          )}
          onPerPageChange={(next) => {
            void navigate({ search: { page: 1, perPage: next } })
          }}
        />
      </CardContent>
    </Card>
  )
}
