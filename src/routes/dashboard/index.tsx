import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
})

function DashboardHome() {
  const { user } = Route.useRouteContext()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your posts</CardTitle>
          <CardDescription>
            Write a draft, schedule it, or publish it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Signed in as {user.fname} {user.lname}.
          </p>
        </CardContent>
        <CardFooter>
          <Button nativeButton={false} render={<Link to="/dashboard/posts" />}>
            Open posts
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your name, contact details, photo, and password.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            nativeButton={false}
            render={<Link to="/dashboard/profile" />}
            variant="outline"
          >
            Open profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
