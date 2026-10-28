import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router"
import type { SearchSchemaInput } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Field } from "@/components/field"
import { Paginator } from "@/components/paginator"
import { PostEditor } from "@/components/post-editor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  addPostComment,
  postCommentsQuery,
  postDetailQuery,
  postKeys,
  postReviewsQuery,
  ratePost,
} from "@/lib/queries/posts"
import type {
  CommentItem,
  Page,
  PostDetail,
  ReviewItem,
  SessionUser,
} from "@/lib/records"
import {
  formatDate,
  isoDate,
  pageFromSearch,
  perPageFromSearch,
} from "@/lib/records"

export const Route = createFileRoute("/(frontend)/posts/$postId")({
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
  loader: async ({ params, context, deps }) => {
    const post = await context.queryClient.query(postDetailQuery(params.postId))
    await Promise.all([
      context.queryClient.query(
        postCommentsQuery(params.postId, deps.commentPage, deps.commentPerPage)
      ),
      context.queryClient.query(
        postReviewsQuery(params.postId, deps.reviewPage, deps.reviewPerPage)
      ),
    ])
    return { post }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.post.title} — Folio` : "Post — Folio",
      },
    ],
  }),
  component: PublicPostPage,
})

function PublicPostPage() {
  const { postId } = Route.useParams()
  const { commentPage, reviewPage, commentPerPage, reviewPerPage } =
    Route.useSearch()
  const { user } = Route.useRouteContext()
  const { data: post } = useSuspenseQuery(postDetailQuery(postId))
  const { data: comments } = useSuspenseQuery(
    postCommentsQuery(postId, commentPage, commentPerPage)
  )
  const { data: reviews } = useSuspenseQuery(
    postReviewsQuery(postId, reviewPage, reviewPerPage)
  )
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
      <Reviews post={post} reviews={reviews} user={user} />
      <Comments post={post} comments={comments} user={user} />
    </div>
  )
}

function Reviews({
  post,
  reviews,
  user,
}: {
  post: PostDetail
  reviews: Page<ReviewItem>
  user: SessionUser | null
}) {
  const { commentPage, commentPerPage, reviewPerPage } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(post.rating.mine)
  const [review, setReview] = useState(post.rating.myReview ?? "")
  const canParticipate = user?.status === "ACTIVE"
  const average =
    post.rating.average === null ? null : post.rating.average.toFixed(1)
  const save = useMutation({
    mutationFn: () => {
      if (score === null) {
        throw new Error("Choose a rating from 1 to 5.")
      }
      return ratePost(post.id, score, review)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: postKeys.detail(post.id) })
      void queryClient.invalidateQueries({
        queryKey: ["posts", "reviews", post.id],
      })
    },
  })
  const failure =
    formError ?? (save.error instanceof Error ? save.error.message : null)

  useEffect(() => {
    setScore(post.rating.mine)
    setReview(post.rating.myReview ?? "")
  }, [post.id, post.rating.mine, post.rating.myReview])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    save.reset()
    if (score === null) {
      setFormError("Choose a rating from 1 to 5.")
      return
    }
    save.mutate()
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
      {reviews.items.length > 0 ? (
        <div className="flex flex-col">
          {reviews.items.map((entry) => (
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
          <Paginator
            meta={reviews.meta}
            link={(next) => (
              <Link
                to="/posts/$postId"
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
                  disabled={save.isPending}
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
              disabled={save.isPending}
            />
          </Field>
          {failure ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save the review</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={save.isPending}>
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

function Comments({
  post,
  comments,
  user,
}: {
  post: PostDetail
  comments: Page<CommentItem>
  user: SessionUser | null
}) {
  const { reviewPage, commentPerPage, reviewPerPage } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const canParticipate = user?.status === "ACTIVE"
  const count = comments.meta.total
  const heading =
    count === 0 ? "Comments" : count === 1 ? "1 comment" : `${count} comments`
  const save = useMutation({
    mutationFn: (body: string) => addPostComment(post.id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["posts", "comments", post.id],
      }),
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save.reset()
    const form = event.currentTarget
    const body = new FormData(form).get("body")
    if (typeof body !== "string") {
      return
    }
    save.mutate(body, {
      onSuccess: () => {
        form.reset()
      },
    })
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
          {comments.items.map((comment) => (
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
          <Paginator
            meta={comments.meta}
            link={(next) => (
              <Link
                to="/posts/$postId"
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
        </div>
      )}
      {canParticipate ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-medium">Leave a comment</h3>
          <Field label="Comment">
            <Textarea name="body" required disabled={save.isPending} />
          </Field>
          {save.error instanceof Error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save the comment</AlertTitle>
              <AlertDescription>{save.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={save.isPending}>
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
