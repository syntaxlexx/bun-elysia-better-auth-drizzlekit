import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { KeyRound } from "lucide-react"
import { useState } from "react"
import { Field } from "@/components/field"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { errorMessage, readApi } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/(auth)/reset-password")({
  head: () => ({
    meta: [{ title: "Choose a new password — Folio" }],
  }),
  validateSearch: (search: Record<string, unknown>) => {
    const token = typeof search.token === "string" ? search.token : ""
    const error = typeof search.error === "string" ? search.error : ""
    if (!error) {
      return { token }
    }
    return { token, error }
  },
  component: ResetPasswordPage,
})

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token, error: linkError = "" } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const invalid = linkError === "INVALID_TOKEN" || token.length === 0

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const nextPassword = field(form, "password")
    if (nextPassword !== field(form, "confirm")) {
      setError("Those passwords do not match.")
      return
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await readApi(
      await api.auth["reset-password"].$post({
        json: { token, newPassword: nextPassword },
      })
    )
    setPending(false)
    if (!result.ok) {
      setError(errorMessage(result.data, "Could not reset the password."))
      return
    }
    await navigate({ to: "/login" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      {invalid ? (
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>This reset link is invalid or expired.</AlertTitle>
          </Alert>
        </CardContent>
      ) : (
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-3">
            <Field label="New password">
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            <Field label="Confirm password">
              <Input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" disabled={pending}>
              <KeyRound data-icon="inline-start" />
              {pending ? "Saving" : "Save password"}
            </Button>
          </CardFooter>
        </form>
      )}
      <CardFooter className="justify-center">
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Request a new link
        </Link>
      </CardFooter>
    </Card>
  )
}
