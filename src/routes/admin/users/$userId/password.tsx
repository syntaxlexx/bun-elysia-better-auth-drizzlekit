import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Field, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { errorMessage } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/admin/users/$userId/password")({
  component: PasswordPage,
})

function PasswordPage() {
  const { detail } = Route.useRouteContext()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const nextPassword = form.get("nextPassword")
    if (typeof nextPassword !== "string") {
      return
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.admin
      .users({ userId: detail.user.id })
      .password.put({ nextPassword })
    setPending(false)
    if (result.error) {
      setError(errorMessage(result.error, "Could not set the password."))
      return
    }
    event.currentTarget.reset()
    setMessage("Password updated.")
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm">{message}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Set password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
