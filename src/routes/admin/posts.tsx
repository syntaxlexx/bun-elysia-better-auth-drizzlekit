import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PostTable } from "@/components/post-table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminPostsQuery } from "@/lib/queries/posts"

export const Route = createFileRoute("/admin/posts")({
  loader: ({ context }) => context.queryClient.query(adminPostsQuery()),
  component: AdminPostsPage,
})

function AdminPostsPage() {
  const { data: posts } = useSuspenseQuery(adminPostsQuery())

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
