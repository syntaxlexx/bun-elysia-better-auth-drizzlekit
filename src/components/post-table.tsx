import { Link } from "@tanstack/react-router"
import { formatTime, postState } from "@/lib/records"
import type { PostSummary } from "@/lib/records"

export function PostTable({
  posts,
  mode,
}: {
  posts: Array<PostSummary>
  mode: "edit" | "public" | "status"
}) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground">No posts yet.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-2 pr-3 font-medium">Title</th>
          <th className="py-2 pr-3 font-medium">Author</th>
          <th className="py-2 pr-3 font-medium">State</th>
          <th className="py-2 pr-3 font-medium">Views</th>
          <th className="py-2 pr-3 font-medium">Rating</th>
          <th className="py-2 font-medium">Updated</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => {
          const state = postState(post)
          return (
            <tr key={post.id} className="border-t border-border">
              <td className="py-3 pr-3">
                {mode === "edit" ? (
                  <Link
                    to="/dashboard/posts/$postId"
                    params={{ postId: post.id }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {post.title}
                  </Link>
                ) : null}
                {mode === "public" && state === "Published" ? (
                  <Link
                    to="/posts/$postId"
                    params={{ postId: post.id }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {post.title}
                  </Link>
                ) : null}
                {mode === "public" && state !== "Published" ? post.title : null}
                {mode === "status" ? (
                  <span className="font-medium">{post.title}</span>
                ) : null}
              </td>
              <td className="py-3 pr-3">{post.authorName}</td>
              <td className="py-3 pr-3">{state}</td>
              <td className="py-3 pr-3">{post.viewsCounter}</td>
              <td className="py-3 pr-3">
                {post.averageRatings === null
                  ? "—"
                  : post.averageRatings.toFixed(1)}
              </td>
              <td className="py-3">{formatTime(post.updatedAt)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
