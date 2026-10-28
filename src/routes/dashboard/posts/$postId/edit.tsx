import { useSuspenseQuery } from "@tanstack/react-query"
import { PostForm } from "@/components/post-form"
import { Button } from "@/components/ui/button"
import { postDetailQuery } from "@/lib/queries/posts"
import { createFileRoute, Link, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/posts/$postId/edit")({
  loader: async ({ context, params }) => {
    const post = await context.queryClient.query(postDetailQuery(params.postId))
    if (post.authorId !== context.user.id) {
      throw notFound()
    }
  },
  component: EditPostPage,
})

function EditPostPage() {
  const { postId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: post } = useSuspenseQuery(postDetailQuery(postId))
  if (post.authorId !== user.id) {
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
