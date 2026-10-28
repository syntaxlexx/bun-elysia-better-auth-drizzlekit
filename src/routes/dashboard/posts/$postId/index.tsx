import { Paginator } from "@/components/paginator"
import { PostEditor } from "@/components/post-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  postCommentsQuery,
  postDetailQuery,
  postReviewsQuery,
} from "@/lib/queries/posts"
import {
  formatTime,
  pageFromSearch,
  perPageFromSearch,
  postState,
} from "@/lib/records"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router"
import type { SearchSchemaInput } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/posts/$postId/")({
  validateSearch: (
    search: {
      commentPage?: number
      reviewPage?: number
      commentPerPage?: number
      reviewPerPage?: number
    } & SearchSchemaInput
  ) => ({
    commentPage: pageFromSearch(search.commentPage),
    reviewPage: pageFromSearch(search.reviewPage),
    commentPerPage: perPageFromSearch(search.commentPerPage),
    reviewPerPage: perPageFromSearch(search.reviewPerPage),
  }),
  search: {
    middlewares: [
      stripSearchParams({
        commentPage: 1,
        reviewPage: 1,
        commentPerPage: 10,
        reviewPerPage: 10,
      }),
    ],
  },
  loaderDeps: ({ search }) => ({
    commentPage: search.commentPage,
    reviewPage: search.reviewPage,
    commentPerPage: search.commentPerPage,
    reviewPerPage: search.reviewPerPage,
  }),
  loader: async ({ context, params, deps }) => {
    await context.queryClient.query(postDetailQuery(params.postId))
    await Promise.all([
      context.queryClient.query(
        postCommentsQuery(params.postId, deps.commentPage, deps.commentPerPage)
      ),
      context.queryClient.query(
        postReviewsQuery(params.postId, deps.reviewPage, deps.reviewPerPage)
      ),
    ])
  },
  component: PostPage,
})

function PostPage() {
  const { postId } = Route.useParams()
  const { commentPage, reviewPage, commentPerPage, reviewPerPage } =
    Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: post } = useSuspenseQuery(postDetailQuery(postId))
  const { data: comments } = useSuspenseQuery(
    postCommentsQuery(postId, commentPage, commentPerPage)
  )
  const { data: reviews } = useSuspenseQuery(
    postReviewsQuery(postId, reviewPage, reviewPerPage)
  )
  const state = postState(post)
  const average =
    post.averageRatings === null ? null : post.averageRatings.toFixed(1)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>{post.title}</CardTitle>
            <CardDescription>{post.authorName}</CardDescription>
          </CardHeader>
          <CardContent>
            <PostEditor initial={post.body} editable={false} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              <Detail label="State" value={state} />
              <Detail label="Views" value={String(post.viewsCounter)} />
              <Detail label="Published" value={formatTime(post.publishedAt)} />
              <Detail label="Created" value={formatTime(post.createdAt)} />
              <Detail label="Updated" value={formatTime(post.updatedAt)} />
            </dl>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <Button
              nativeButton={false}
              render={
                <Link
                  to="/dashboard/posts/$postId/edit"
                  params={{ postId: post.id }}
                />
              }
            >
              Edit post
            </Button>
            {state === "Published" ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link to="/posts/$postId" params={{ postId: post.id }} />
                }
              >
                Public page
              </Button>
            ) : null}
          </CardFooter>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ratings and reviews</CardTitle>
          <CardDescription>
            {post.rating.count === 0
              ? "No ratings yet."
              : `${average} average from ${post.rating.count} ${post.rating.count === 1 ? "rating" : "ratings"}`}
            {post.rating.mine === null
              ? ""
              : ` · Your rating is ${post.rating.mine}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.meta.total === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.items.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-border p-3"
                >
                  <p className="text-sm font-medium">{entry.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.score} / 5 · {formatTime(entry.createdAt)}
                  </p>
                  {entry.review ? (
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                      {entry.review}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Paginator
            meta={reviews.meta}
            link={(next) => (
              <Link
                to="/dashboard/posts/$postId"
                params={{ postId: post.id }}
                search={{
                  commentPage,
                  commentPerPage,
                  reviewPage: next,
                  reviewPerPage,
                }}
              />
            )}
            onPerPageChange={(next) => {
              void navigate({
                search: {
                  commentPage,
                  commentPerPage,
                  reviewPage: 1,
                  reviewPerPage: next,
                },
              })
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {comments.meta.total === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.items.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-2xl border border-border p-3"
                >
                  <p className="text-sm font-medium">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(comment.createdAt)}
                  </p>
                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Paginator
            meta={comments.meta}
            link={(next) => (
              <Link
                to="/dashboard/posts/$postId"
                params={{ postId: post.id }}
                search={{
                  reviewPage,
                  reviewPerPage,
                  commentPage: next,
                  commentPerPage,
                }}
              />
            )}
            onPerPageChange={(next) => {
              void navigate({
                search: {
                  reviewPage,
                  reviewPerPage,
                  commentPage: 1,
                  commentPerPage: next,
                },
              })
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
