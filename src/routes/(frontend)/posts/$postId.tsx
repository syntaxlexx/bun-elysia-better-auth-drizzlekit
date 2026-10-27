import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Field } from "@/components/field"
import { PostEditor } from "@/components/post-editor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { SessionUser } from "@/lib/records"
import { errorMessage, formatDate, isoDate, isPostDetail } from "@/lib/records"
import { getTreaty } from "@api"

async function loadPost({
  postId,
  user,
}: {
  postId: string
  user: SessionUser | null
}) {
  const { api } = await getTreaty()
  const postResult = await api.posts({ postId }).get()
  if (postResult.error || !isPostDetail(postResult.data)) {
    throw notFound()
  }
  return {
    post: postResult.data,
    user,
  }
}

export const Route = createFileRoute("/(frontend)/posts/$postId")({
  head: ({
    loaderData,
  }: {
    loaderData?: Awaited<ReturnType<typeof loadPost>>
  }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.post.title} — Folio` : "Post — Folio",
      },
    ],
  }),
  loader: ({ params, context }) =>
    loadPost({ postId: params.postId, user: context.user }),
  component: PublicPostPage,
})

function PublicPostPage() {
  const { post } = Route.useLoaderData()
  const when = post.publishedAt ?? post.createdAt
  const date = formatDate(when)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-14 py-16">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link
            to="/posts"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            All posts
          </Link>
          <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>
          <p className="text-muted-foreground">
            By {post.authorName}
            <span aria-hidden="true"> · </span>
            <time dateTime={isoDate(when)}>{date}</time>
            <span aria-hidden="true"> · </span>
            {post.viewsCounter} {post.viewsCounter === 1 ? "view" : "views"}
          </p>
        </header>
        <PostEditor initial={post.body} editable={false} plain />
      </article>
      <Reviews />
      <Comments />
    </div>
  )
}

function Reviews() {
  const router = useRouter()
  const { post, user } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [score, setScore] = useState<number | null>(post.rating.mine)
  const [review, setReview] = useState(post.rating.myReview ?? "")
  const canParticipate = user?.status === "ACTIVE"
  const average =
    post.rating.average === null ? null : post.rating.average.toFixed(1)

  useEffect(() => {
    setScore(post.rating.mine)
    setReview(post.rating.myReview ?? "")
  }, [post.id, post.rating.mine, post.rating.myReview])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  return (
    <section className="flex flex-col gap-6" aria-labelledby="reviews-heading">
      <div className="flex flex-col gap-2">
        <h2
          id="reviews-heading"
          className="font-heading text-2xl font-medium tracking-tight"
        >
          Reviews
        </h2>
        <p className="text-sm text-muted-foreground">
          {post.rating.count === 0
            ? "No reviews yet."
            : `${average} average from ${post.rating.count} ${post.rating.count === 1 ? "review" : "reviews"}`}
        </p>
      </div>
      <Separator />
      {post.rating.reviews.length > 0 ? (
        <div className="flex flex-col">
          {post.rating.reviews.map((entry) => (
            <article key={entry.id} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 py-6">
                <p className="font-medium">{entry.authorName}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.score} out of 5<span aria-hidden="true"> · </span>
                  <time dateTime={isoDate(entry.createdAt)}>
                    {formatDate(entry.createdAt)}
                  </time>
                </p>
                {entry.review ? (
                  <p className="whitespace-pre-wrap">{entry.review}</p>
                ) : null}
              </div>
              <Separator />
            </article>
          ))}
        </div>
      ) : null}
      {canParticipate ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-medium">Leave a review</h3>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Your rating</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={score === value ? "default" : "outline"}
                  aria-pressed={score === value}
                  disabled={pending}
                  onClick={() => setScore(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </fieldset>
          <Field label="Review">
            <Textarea
              value={review}
              onChange={(event) => setReview(event.target.value)}
              maxLength={2000}
              placeholder="What stayed with you?"
              disabled={pending}
            />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save the review</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={pending}>
            {post.rating.mine === null ? "Publish review" : "Update review"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>{" "}
          to leave a review.
        </p>
      )}
    </section>
  )
}

function Comments() {
  const router = useRouter()
  const { post, user } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const canParticipate = user?.status === "ACTIVE"
  const count = post.comments.length
  const heading =
    count === 0 ? "Comments" : count === 1 ? "1 comment" : `${count} comments`

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <section className="flex flex-col gap-6" aria-labelledby="comments-heading">
      <h2
        id="comments-heading"
        className="font-heading text-2xl font-medium tracking-tight"
      >
        {heading}
      </h2>
      <Separator />
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="flex flex-col">
          {post.comments.map((comment) => (
            <article key={comment.id} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 py-6">
                <p className="font-medium">{comment.authorName}</p>
                <p className="text-sm text-muted-foreground">
                  <time dateTime={isoDate(comment.createdAt)}>
                    {formatDate(comment.createdAt)}
                  </time>
                </p>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </div>
              <Separator />
            </article>
          ))}
        </div>
      )}
      {canParticipate ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-medium">Leave a comment</h3>
          <Field label="Comment">
            <Textarea name="body" required disabled={pending} />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save the comment</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={pending}>
            Post comment
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}
    </section>
  )
}
