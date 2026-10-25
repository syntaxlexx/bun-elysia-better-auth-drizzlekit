import { createFileRoute, Link, notFound } from "@tanstack/react-router"
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
import { formatTime, isPostDetail, postState } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"

export const Route = createFileRoute("/dashboard/posts/$postId")({
  loader: async ({ params }) => {
    const { api } = await getTreaty()
    const result = await api.posts({ postId: params.postId }).get()
    if (result.error || !isPostDetail(result.data)) {
      throw notFound()
    }
    return { post: result.data }
  },
  component: PostPage,
})

function PostPage() {
  const { post } = Route.useLoaderData()
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
          {post.rating.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {post.rating.reviews.map((entry) => (
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {post.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {post.comments.map((comment) => (
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
