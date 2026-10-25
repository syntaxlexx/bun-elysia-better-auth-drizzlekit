import { createFileRoute } from "@tanstack/react-router"
import { PostTable } from "@/components/post-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const Route = createFileRoute("/admin/users/$userId/posts")({
  component: UserPostsPage,
})

function UserPostsPage() {
  const { detail } = Route.useRouteContext()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts posted</CardTitle>
      </CardHeader>
      <CardContent>
        <PostTable posts={detail.posts} mode="public" />
      </CardContent>
    </Card>
  )
}
