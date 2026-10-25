import { createFileRoute } from "@tanstack/react-router"
import { PostForm } from "@/components/post-form"

export const Route = createFileRoute("/dashboard/posts/new")({
  component: NewPostPage,
})

function NewPostPage() {
  return <PostForm />
}
