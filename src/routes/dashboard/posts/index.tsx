import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PostTable } from "@/components/post-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ownPostsQuery } from "@/lib/queries/posts"

export const Route = createFileRoute("/dashboard/posts/")({
  loader: ({ context }) => context.queryClient.query(ownPostsQuery()),
  component: OwnPostsPage,
})

function OwnPostsPage() {
  const { data: posts } = useSuspenseQuery(ownPostsQuery())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your posts</CardTitle>
      </CardHeader>
      <CardContent>
        <PostTable posts={posts} mode="edit" />
      </CardContent>
      <CardFooter>
        <Button
          nativeButton={false}
          render={<Link to="/dashboard/posts/new" />}
        >
          New post
        </Button>
      </CardFooter>
    </Card>
  )
}
