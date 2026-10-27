import { createFileRoute, redirect } from "@tanstack/react-router"
import { SignOutButton } from "@/components/app-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatTime } from "@/lib/records"

export const Route = createFileRoute("/(frontend)/account-status")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login" })
    }
    if (context.user.status === "ACTIVE") {
      throw redirect({ to: "/dashboard" })
    }
    return { user: context.user }
  },
  component: AccountStatusPage,
})

function AccountStatusPage() {
  const { user } = Route.useRouteContext()
  const hold = user.hold

  return (
    <div className="min-h-svh p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account unavailable</CardTitle>
          <CardDescription>
            {user.fname} {user.lname} cannot use the dashboard right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{hold?.message ?? "This account cannot sign in."}</p>
          {hold?.bannedAt ? <p>Banned {formatTime(hold.bannedAt)}</p> : null}
          {hold?.lockedUntil ? (
            <p>Locked until {formatTime(hold.lockedUntil)}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <SignOutButton />
        </CardFooter>
      </Card>
    </div>
  )
}
