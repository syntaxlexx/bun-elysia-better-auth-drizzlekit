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

export const Route = createFileRoute("/(auth)/register")({
  head: () => ({
    meta: [{ title: "Create an account — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    if (!result.error && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: RegisterPage,
})

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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Open a desk</CardTitle>
        <CardDescription>
          A name, a password, and either an email or a phone number.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input name="fname" autoComplete="given-name" required />
            </Field>
            <Field label="Last name">
              <Input name="lname" autoComplete="family-name" required />
            </Field>
          </div>
          <Field label="Email">
            <Input
              name="email"
              type="text"
              inputMode="email"
              autoComplete="email"
            />
          </Field>
          <Field label="Phone">
            <Input name="phone" autoComplete="tel" placeholder="+14155552671" />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create the account</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating account" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have a desk?{" "}
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
