import { createFileRoute, Link } from "@tanstack/react-router"
import { PostTable } from "@/components/post-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isPostList } from "@/lib/records"
import { getTreaty } from "../api.$"

export const Route = createFileRoute("/posts/")({
  loader: async () => {
    const { api } = await getTreaty()
    const result = await api.posts.get()
    if (result.error || !isPostList(result.data)) {
      throw new Error("Could not load posts.")
    }
    return { posts: result.data }
  },
  component: PublicPostsPage,
})

function PublicPostsPage() {
  const { posts } = Route.useLoaderData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Published posts</CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing published yet.{" "}
            <Link to="/dashboard/posts/new" className="underline">
              Write the first post
            </Link>
          </p>
        ) : (
          <PostTable posts={posts} mode="public" />
        )}
      </CardContent>
    </Card>
  )
}
