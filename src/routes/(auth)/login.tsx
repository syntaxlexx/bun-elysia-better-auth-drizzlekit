import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
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
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "../api.$"

export const Route = createFileRoute("/(auth)/login")({
  head: () => ({
    meta: [{ title: "Log in — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (!result.error && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: LoginPage,
})

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function timeLabel(value: unknown) {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null
  if (!date || Number.isNaN(date.getTime())) {
    return null
  }
  return date.toLocaleString()
}

type LoginFailure = {
  message?: string
  bannedAt?: string | null
  lockedUntil?: string | null
}

function LoginPage() {
  const navigate = useNavigate()
  const [failure, setFailure] = useState<LoginFailure | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailure(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const { api } = await getTreaty()
    const result = await api.auth.login.post({
      identifier: field(form, "identifier"),
      password: field(form, "password"),
    })
    setPending(false)

    if (result.error) {
      const value = result.error.value
      setFailure({
        message:
          "message" in value && typeof value.message === "string"
            ? value.message
            : "Could not sign in.",
        bannedAt: "bannedAt" in value ? timeLabel(value.bannedAt) : null,
        lockedUntil:
          "lockedUntil" in value ? timeLabel(value.lockedUntil) : null,
      })
      return
    }

    await navigate({ to: "/dashboard" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Use the email or phone on your Folio account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-3">
          <Field label="Email or phone">
            <Input name="identifier" autoComplete="username" required />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {failure?.message ? (
            <Alert variant="destructive">
              <AlertTitle>{failure.message}</AlertTitle>
              {failure.bannedAt || failure.lockedUntil ? (
                <AlertDescription>
                  {failure.bannedAt ? <p>Banned {failure.bannedAt}</p> : null}
                  {failure.lockedUntil ? (
                    <p>Locked until {failure.lockedUntil}</p>
                  ) : null}
                </AlertDescription>
              ) : null}
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in" : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to Folio?{" "}
            <Link
              to="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
