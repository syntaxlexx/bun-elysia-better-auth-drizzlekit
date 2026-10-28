import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PostTable } from "@/components/post-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminUserQuery } from "@/lib/queries/users"

export const Route = createFileRoute("/admin/users/$userId/posts")({
  component: UserPostsPage,
})

function UserPostsPage() {
  const { userId } = Route.useParams()
  const { data } = useSuspenseQuery(adminUserQuery(userId))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts posted</CardTitle>
      </CardHeader>
      <CardContent>
        <PostTable posts={data.posts} mode="public" />
      </CardContent>
    </Card>
  )
}
