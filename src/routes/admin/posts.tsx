import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router"
import type { SearchSchemaInput } from "@tanstack/react-router"
import { Paginator } from "@/components/paginator"
import { PostTable } from "@/components/post-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminPostsQuery } from "@/lib/queries/posts"
import { pageFromSearch, perPageFromSearch } from "@/lib/records"

export const Route = createFileRoute("/admin/posts")({
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
    context.queryClient.query(adminPostsQuery(deps.page, deps.perPage)),
  component: AdminPostsPage,
})

function AdminPostsPage() {
  const { page, perPage } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(adminPostsQuery(page, perPage))

  return (
    <Card>
      <CardHeader>
        <CardTitle>All posts</CardTitle>
        <CardDescription>
          Drafts and scheduled posts stay in this list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PostTable posts={data.items} mode="public" />
        <Paginator
          meta={data.meta}
          link={(next) => (
            <Link to="/admin/posts" search={{ page: next, perPage }} />
          )}
          onPerPageChange={(next) => {
            void navigate({ search: { page: 1, perPage: next } })
          }}
        />
      </CardContent>
    </Card>
  )
}
