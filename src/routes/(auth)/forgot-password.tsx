import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { KeyRound, Mail } from "lucide-react"
import { useState } from "react"
import { Field } from "@/components/field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { errorMessage, isSessionUser, readApi } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/(auth)/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset password — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.$get())
    if (result.ok && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: ForgotPasswordPage,
})

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function resetUrl(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "resetUrl" in value &&
    typeof value.resetUrl === "string"
  ) {
    return value.resetUrl
  }
  return null
}

function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLink(null)
    setSent(false)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const { api } = await getTreaty()
    const result = await readApi(
      await api.auth["forgot-password"].$post({
        json: { identifier: field(form, "identifier") },
      })
    )
    setPending(false)
    if (!result.ok) {
      setError(errorMessage(result.data, "Could not start a password reset."))
      return
    }
    setSent(true)
    setLink(resetUrl(result.data))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email or phone on your Folio account. The reset link expires
          in one hour.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-3">
          <Field label="Email or phone">
            <Input name="identifier" autoComplete="username" required />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          ) : null}
          {sent ? (
            <Alert>
              <AlertTitle>
                If that account exists, a reset link is ready.
              </AlertTitle>
              {link ? (
                <AlertDescription>
                  Mail is not configured here, so open the link directly.
                </AlertDescription>
              ) : null}
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            <Mail data-icon="inline-start" />
            {pending ? "Sending" : "Send reset link"}
          </Button>
          {link ? (
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<a href={link} />}
            >
              <KeyRound data-icon="inline-start" />
              Open reset link
            </Button>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
