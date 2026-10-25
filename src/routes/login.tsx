import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "./api.$"

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (!result.error && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: LoginPage,
})

const fieldClassName =
  "border-input bg-background h-8 w-full rounded-2xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

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
    <div className="min-h-svh p-6">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Use the email or phone on your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Email or phone
              <input
                className={fieldClassName}
                name="identifier"
                autoComplete="username"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Password
              <input
                className={fieldClassName}
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {failure?.message ? (
              <div className="flex flex-col gap-1 text-sm text-destructive">
                <p>{failure.message}</p>
                {failure.bannedAt ? <p>Banned {failure.bannedAt}</p> : null}
                {failure.lockedUntil ? (
                  <p>Locked until {failure.lockedUntil}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in" : "Log in"}
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/register" />}
              variant="outline"
            >
              Register
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
