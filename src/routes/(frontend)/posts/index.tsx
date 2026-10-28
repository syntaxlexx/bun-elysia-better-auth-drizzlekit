import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router"
import type { SearchSchemaInput } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Paginator } from "@/components/paginator"
import { Separator } from "@/components/ui/separator"
import { publicPostsQuery } from "@/lib/queries/posts"
import {
  formatDate,
  isoDate,
  pageFromSearch,
  perPageFromSearch,
  postState,
} from "@/lib/records"
import type { PostSummary } from "@/lib/records"

export const Route = createFileRoute("/(frontend)/posts/")({
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
  head: () => ({
    meta: [
      { title: "Posts — Folio" },
      {
        name: "description",
        content: "Published writing on the Folio shelf.",
      },
    ],
  }),
  loader: ({ context, deps }) =>
    context.queryClient.query(publicPostsQuery(deps.page, deps.perPage)),
  component: PublicPostsPage,
})

function PublicPostsPage() {
  const { page, perPage } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(publicPostsQuery(page, perPage))
  const posts = data.items

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          The shelf
        </p>
        <h1 className="font-heading text-4xl font-medium tracking-tight">
          Posts
        </h1>
        <p className="text-muted-foreground">
          Published pieces, in the order they were written.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="py-16 text-muted-foreground">
          Nothing on the shelf yet.{" "}
          <Link
            to="/dashboard/posts/new"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Write the first post
          </Link>
        </p>
      ) : (
        <div className="flex flex-col pt-8">
          {posts.map((post) => (
            <ArchiveEntry key={post.id} post={post} />
          ))}
          <Paginator
            meta={data.meta}
            link={(next) => (
              <Link to="/posts" search={{ page: next, perPage }} />
            )}
            onPerPageChange={(next) => {
              void navigate({ search: { page: 1, perPage: next } })
            }}
          />
        </div>
      )}
    </main>
  )
}

function ArchiveEntry({ post }: { post: PostSummary }) {
  const published = postState(post) === "Published"
  const when = post.publishedAt ?? post.createdAt
  const date = formatDate(when)
  const rating =
    post.averageRatings === null
      ? "No ratings yet"
      : `${post.averageRatings.toFixed(1)} average rating`

  return (
    <article className="flex flex-col gap-3">
      <Separator />
      <div className="flex flex-col gap-3 py-8">
        <p className="text-sm text-muted-foreground">
          <time dateTime={isoDate(when)}>{date}</time>
          <span aria-hidden="true"> · </span>
          {post.authorName}
        </p>
        <h2 className="font-heading text-3xl font-medium tracking-tight text-balance">
          {published ? (
            <Link
              to="/posts/$postId"
              params={{ postId: post.id }}
              className="underline-offset-4 hover:underline"
            >
              {post.title}
            </Link>
          ) : (
            post.title
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {post.viewsCounter} {post.viewsCounter === 1 ? "view" : "views"}
          <span aria-hidden="true"> · </span>
          {rating}
        </p>
        {published ? (
          <Link
            to="/posts/$postId"
            params={{ postId: post.id }}
            className="inline-flex items-center gap-1 text-sm font-medium"
          >
            Continue reading
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </article>
  )
}
