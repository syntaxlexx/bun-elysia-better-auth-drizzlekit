import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { PostEditor } from "@/components/post-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  errorMessage,
  formatTime,
  isPostDetail,
  isSessionUser,
} from "@/lib/records"
import { getTreaty } from "../../api.$"

export const Route = createFileRoute("/(frontend)/posts/$postId")({
  loader: async ({ params }) => {
    const { api } = await getTreaty()
    const [postResult, meResult] = await Promise.all([
      api.posts({ postId: params.postId }).get(),
      api.me.get(),
    ])
    if (postResult.error || !isPostDetail(postResult.data)) {
      throw notFound()
    }
    return {
      post: postResult.data,
      user:
        meResult.error || !isSessionUser(meResult.data) ? null : meResult.data,
    }
  },
  component: PublicPostPage,
})

function PublicPostPage() {
  const router = useRouter()
  const { post, user } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [score, setScore] = useState<number | null>(post.rating.mine)
  const [review, setReview] = useState(post.rating.myReview ?? "")
  const canParticipate = user?.status === "ACTIVE"

  useEffect(() => {
    setScore(post.rating.mine)
    setReview(post.rating.myReview ?? "")
  }, [post.id, post.rating.mine, post.rating.myReview])
  const average =
    post.averageRatings === null ? null : post.averageRatings.toFixed(1)

  async function rate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (score === null) {
      setError("Choose a rating from 1 to 5.")
      return
    }
    setError(null)
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.posts({ postId: post.id }).rating.put({
      score,
      review,
    })
    setPending(false)
    if (result.error) {
      setError(errorMessage(result.error, "Could not save the rating."))
      return
    }
    await router.invalidate()
  }

  async function onComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const body = form.get("body")
    if (typeof body !== "string") {
      return
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.posts({ postId: post.id }).comments.post({ body })
    setPending(false)
    if (result.error) {
      setError(errorMessage(result.error, "Could not save the comment."))
      return
    }
    event.currentTarget.reset()
    await router.invalidate()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {post.authorName} · {formatTime(post.publishedAt ?? post.createdAt)}{" "}
            · {post.viewsCounter} views
          </p>
        </CardHeader>
        <CardContent>
          <PostEditor initial={post.body} editable={false} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rating</CardTitle>
          <p className="text-sm text-muted-foreground">
            {post.rating.count === 0
              ? "No ratings yet."
              : `${average} average from ${post.rating.count} ${post.rating.count === 1 ? "rating" : "ratings"}`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canParticipate ? (
            <form onSubmit={rate} className="flex flex-col gap-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={score === value ? "default" : "outline"}
                    disabled={pending}
                    onClick={() => setScore(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <Textarea
                value={review}
                onChange={(event) => setReview(event.target.value)}
                maxLength={2000}
                placeholder="Write a review"
                disabled={pending}
              />
              <Button type="submit" disabled={pending}>
                {post.rating.mine === null ? "Rate" : "Update rating"}
              </Button>
            </form>
          ) : (
            <Link to="/login" className="text-sm underline">
              Log in to rate this post
            </Link>
          )}
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
        <CardContent className="flex flex-col gap-4">
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
          {canParticipate ? (
            <form onSubmit={onComment} className="flex flex-col gap-3">
              <textarea
                name="body"
                required
                className="min-h-24 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none"
              />
              <Button type="submit" disabled={pending}>
                Comment
              </Button>
            </form>
          ) : (
            <Link to="/login" className="text-sm underline">
              Log in to comment
            </Link>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
