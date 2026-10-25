import { createFileRoute, notFound } from "@tanstack/react-router"
import { PostForm } from "@/components/post-form"
import { errorMessage, isOwnedPostList } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"

export const Route = createFileRoute("/dashboard/posts/$postId")({
  loader: async ({ params }) => {
    const { api } = await getTreaty()
    const result = await api.me.posts.get()
    if (result.error || !isOwnedPostList(result.data)) {
      throw new Error(errorMessage(result.error, "Could not load the post."))
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
  return <PostForm post={post} />
}
