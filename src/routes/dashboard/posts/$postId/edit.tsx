import { PostForm } from "@/components/post-form"
import { Button } from "@/components/ui/button"
import { errorMessage, isOwnedPostList, readApi } from "@/lib/records"
import { getTreaty } from "@api"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/posts/$postId/edit")({
  loader: async ({ params }) => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.posts.$get())
    if (!result.ok || !isOwnedPostList(result.data)) {
      throw new Error(errorMessage(result.data, "Could not load the post."))
    }
    const post = result.data.find((item) => item.id === params.postId)
    if (!post) {
      throw notFound()
    }
    return { post }
  },
  component: EditPostPage,
})

function EditPostPage() {
  const { post } = Route.useLoaderData()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          nativeButton={false}
          variant="outline"
          render={
            <Link to="/dashboard/posts/$postId" params={{ postId: post.id }} />
          }
        >
          Back to post
        </Button>
      </div>
      <PostForm post={post} />
    </div>
  )
}
