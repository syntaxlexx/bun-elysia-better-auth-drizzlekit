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
import { errorMessage, readApi, toDateTimeLocal } from "@/lib/records"
import type { OwnedPost } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

export function PostForm({ post }: { post?: OwnedPost }) {
  const navigate = useNavigate()
  const bodyRef = useRef<Array<Record<string, unknown>>>(post?.body ?? [])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const publishedAtValue = field(form, "publishedAt")
    if (
      publishedAtValue &&
      Number.isNaN(new Date(publishedAtValue).getTime())
    ) {
      setError("Enter a valid publish date.")
      return
    }

    const payload = {
      title: field(form, "title"),
      body: bodyRef.current,
      status:
        field(form, "status") === "PUBLISHED"
          ? ("PUBLISHED" as const)
          : ("DRAFT" as const),
      publishedAt: publishedAtValue
        ? new Date(publishedAtValue).toISOString()
        : null,
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await readApi(
      post
        ? await api.posts[":postId"].$patch({
            param: { postId: post.id },
            json: payload,
          })
        : await api.posts.$post({ json: payload })
    )
    setPending(false)

    if (!result.ok) {
      setError(errorMessage(result.data, "Could not save the post."))
      return
    }

    const saved = result.data
    if (
      saved !== null &&
      typeof saved === "object" &&
      "id" in saved &&
      typeof saved.id === "string"
    ) {
      await navigate({
        to: "/dashboard/posts/$postId",
        params: { postId: saved.id },
      })
      return
    }
    await navigate({ to: "/dashboard/posts" })
  }

  async function onDelete() {
    if (!post) {
      return
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await readApi(
      await api.posts[":postId"].$delete({ param: { postId: post.id } })
    )
    setPending(false)
    if (!result.ok) {
      setError(errorMessage(result.data, "Could not delete the post."))
      return
    }
    await navigate({ to: "/dashboard/posts" })
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
              onClick={() => void onDelete()}
            >
              Delete
            </Button>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  )
}
