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
import { errorMessage, isOwnedPostList, readApi } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/dashboard/posts/")({
  loader: async () => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.posts.$get())
    if (!result.ok || !isOwnedPostList(result.data)) {
      throw new Error(errorMessage(result.data, "Could not load your posts."))
    }
    return { posts: result.data }
  },
  component: OwnPostsPage,
})

function OwnPostsPage() {
  const { posts } = Route.useLoaderData()

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
