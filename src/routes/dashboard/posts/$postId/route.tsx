import { Button } from "@/components/ui/button"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { MoveLeft } from "lucide-react"

export const Route = createFileRoute("/dashboard/posts/$postId")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between py-2">
        <Link to="/dashboard/posts">
          <Button variant="ghost">
            <MoveLeft />
            Back to posts
          </Button>
        </Link>
      </section>
      <Outlet />
    </div>
  )
}
