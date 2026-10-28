import { useSuspenseQuery } from "@tanstack/react-query"
import { PostForm } from "@/components/post-form"
import { Button } from "@/components/ui/button"
import { ownPostsQuery } from "@/lib/queries/posts"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/posts/$postId/edit")({
  loader: async ({ context, params }) => {
    const posts = await context.queryClient.query(ownPostsQuery())
    if (!posts.some((item) => item.id === params.postId)) {
      throw notFound()
    }
  },
  component: EditPostPage,
})

function EditPostPage() {
  const { postId } = Route.useParams()
  const { data: posts } = useSuspenseQuery(ownPostsQuery())
  const post = posts.find((item) => item.id === postId)
  if (!post) {
    throw notFound()
  }

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
