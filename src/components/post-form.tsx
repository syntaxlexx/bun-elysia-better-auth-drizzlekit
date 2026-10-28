import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { Field, fieldClassName } from "@/components/field"
import { PostEditor } from "@/components/post-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { deletePost, postKeys, savePost } from "@/lib/queries/posts"
import type { PostWrite } from "@/lib/queries/posts"
import { toDateTimeLocal } from "@/lib/records"
import type { OwnedPost } from "@/lib/records"

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function message(error: unknown) {
  return error instanceof Error ? error.message : null
}

export function PostForm({ post }: { post?: OwnedPost }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const bodyRef = useRef<Array<Record<string, unknown>>>(post?.body ?? [])
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (payload: PostWrite) => savePost(post?.id, payload),
    onSuccess: async (postId) => {
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
      if (postId) {
        await navigate({
          to: "/dashboard/posts/$postId",
          params: { postId },
        })
        return
      }
      await navigate({ to: "/dashboard/posts" })
    },
  })

  const remove = useMutation({
    mutationFn: () => {
      if (!post) {
        throw new Error("Could not delete the post.")
      }
      return deletePost(post.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postKeys.all })
      await navigate({ to: "/dashboard/posts" })
    },
  })

  const pending = save.isPending || remove.isPending
  const failure = error ?? message(save.error) ?? message(remove.error)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    save.reset()
    remove.reset()
    const form = new FormData(event.currentTarget)
    const publishedAtValue = field(form, "publishedAt")
    if (
      publishedAtValue &&
      Number.isNaN(new Date(publishedAtValue).getTime())
    ) {
      setError("Enter a valid publish date.")
      return
    }

    save.mutate({
      title: field(form, "title"),
      body: bodyRef.current,
      status: field(form, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      publishedAt: publishedAtValue
        ? new Date(publishedAtValue).toISOString()
        : null,
    })
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>{post ? "Edit post" : "New post"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Title">
            <input
              className={fieldClassName}
              name="title"
              defaultValue={post?.title ?? ""}
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                className={fieldClassName}
                name="status"
                defaultValue={post?.status ?? "DRAFT"}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </Field>
            <Field label="Publish at">
              <input
                className={fieldClassName}
                name="publishedAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(post?.publishedAt ?? null)}
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">
            Leave the date empty to publish immediately. A future date keeps a
            published post scheduled.
          </p>
          <PostEditor
            initial={post?.body ?? []}
            onChange={(blocks) => {
              bodyRef.current = blocks
            }}
          />
          {post ? (
            <p className="text-sm text-muted-foreground">
              {post.viewsCounter} views
            </p>
          ) : null}
          {failure ? (
            <p className="text-sm text-destructive">{failure}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving" : "Save"}
          </Button>
          {post ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setError(null)
                save.reset()
                remove.mutate()
              }}
            >
              Delete
            </Button>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  )
}
