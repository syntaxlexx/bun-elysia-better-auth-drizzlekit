import { AuthSwitch } from "@/components/auth-switch"
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
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { LogIn } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/(auth)/login")({
  head: () => ({
    meta: [{ title: "Log in — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.$get())
    if (result.ok && isSessionUser(result.data)) {
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
    const result = await readApi(
      await api.auth.login.$post({
        json: {
          email: field(form, "email"),
          password: field(form, "password"),
        },
      })
    )
    setPending(false)

    if (!result.ok) {
      const value = result.data
      setFailure({
        message: errorMessage(value, "Could not sign in."),
        bannedAt:
          typeof value === "object" && value !== null && "bannedAt" in value
            ? timeLabel(value.bannedAt)
            : null,
        lockedUntil:
          typeof value === "object" && value !== null && "lockedUntil" in value
            ? timeLabel(value.lockedUntil)
            : null,
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
          Email and password. Phone numbers sign in with a code.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-3">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <p className="text-right text-sm">
            <Link
              to="/forgot-password"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </p>
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
            <LogIn data-icon="inline-start" />
            {pending ? "Signing in" : "Log in"}
          </Button>
          <AuthSwitch current="/login" />
        </CardFooter>
      </form>
    </Card>
  )
}
