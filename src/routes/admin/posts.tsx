import { createFileRoute } from "@tanstack/react-router"
import { PostTable } from "@/components/post-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { errorMessage, isPostList } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/admin/posts")({
  loader: async () => {
    const { api } = await getTreaty()
    const result = await api.admin.posts.get()
    if (result.error || !isPostList(result.data)) {
      throw new Error(errorMessage(result.error, "Could not load posts."))
    }
    return { posts: result.data }
  },
  component: AdminPostsPage,
})

function AdminPostsPage() {
  const { posts } = Route.useLoaderData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>All posts</CardTitle>
        <CardDescription>
          Drafts and scheduled posts stay in this list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PostTable posts={posts} mode="public" />
      </CardContent>
    </Card>
  )
}
