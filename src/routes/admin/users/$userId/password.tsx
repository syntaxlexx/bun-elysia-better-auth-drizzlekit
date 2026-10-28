import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Field, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminUserQuery, setUserPassword } from "@/lib/queries/users"

export const Route = createFileRoute("/admin/users/$userId/password")({
  component: PasswordPage,
})

function PasswordPage() {
  const { userId } = Route.useParams()
  const { data } = useSuspenseQuery(adminUserQuery(userId))
  const save = useMutation({
    mutationFn: (nextPassword: string) =>
      setUserPassword(data.user.id, nextPassword),
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save.reset()
    const form = event.currentTarget
    const nextPassword = new FormData(form).get("nextPassword")
    if (typeof nextPassword !== "string") {
      return
    }
    save.mutate(nextPassword, {
      onSuccess: () => {
        form.reset()
      },
    })
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>Manage passwords</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="New password">
            <input
              className={fieldClassName}
              name="nextPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          {save.error instanceof Error ? (
            <p className="text-sm text-destructive">{save.error.message}</p>
          ) : null}
          {save.isSuccess ? <p className="text-sm">Password updated.</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={save.isPending}>
            Set password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
