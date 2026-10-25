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

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (!result.error && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: RegisterPage,
})

const fieldClassName =
  "border-input bg-background h-8 w-full rounded-2xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const { api } = await getTreaty()
    const result = await api.auth.register.post({
      fname: field(form, "fname"),
      lname: field(form, "lname"),
      email: field(form, "email"),
      phone: field(form, "phone"),
      password: field(form, "password"),
    })
    setPending(false)

    if (result.error) {
      const value = result.error.value
      setError(
        "message" in value && typeof value.message === "string"
          ? value.message
          : "Could not create the account."
      )
      return
    }

    await navigate({ to: "/dashboard" })
  }

  return (
    <div className="min-h-svh p-6">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Use an email address, a phone number, or both.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              First name
              <input className={fieldClassName} name="fname" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Last name
              <input className={fieldClassName} name="lname" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                className={fieldClassName}
                name="email"
                type="text"
                inputMode="email"
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Phone
              <input
                className={fieldClassName}
                name="phone"
                autoComplete="tel"
                placeholder="+14155552671"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Password
              <input
                className={fieldClassName}
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating account" : "Create account"}
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/login" />}
              variant="outline"
            >
              Log in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
