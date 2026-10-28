import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router"
import type { SearchSchemaInput } from "@tanstack/react-router"
import { Paginator } from "@/components/paginator"
import { PostTable } from "@/components/post-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ownPostsQuery } from "@/lib/queries/posts"
import { pageFromSearch, perPageFromSearch } from "@/lib/records"

export const Route = createFileRoute("/dashboard/posts/")({
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
    context.queryClient.query(ownPostsQuery(deps.page, deps.perPage)),
  component: OwnPostsPage,
})

function OwnPostsPage() {
  const { page, perPage } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(ownPostsQuery(page, perPage))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your posts</CardTitle>
      </CardHeader>
      <CardContent>
        <PostTable posts={data.items} mode="edit" />
        <Paginator
          meta={data.meta}
          link={(next) => (
            <Link to="/dashboard/posts" search={{ page: next, perPage }} />
          )}
          onPerPageChange={(next) => {
            void navigate({ search: { page: 1, perPage: next } })
          }}
        />
      </CardContent>
      <CardFooter>
        <Button
          nativeButton={false}
          render={<Link to="/dashboard/posts/new" />}
        >
          New post
        </Button>
      </CardFooter>
    </Card>
  )
}
