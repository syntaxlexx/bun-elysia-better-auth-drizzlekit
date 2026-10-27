import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { UserPlus } from "lucide-react"
import { useState } from "react"
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

export const Route = createFileRoute("/(auth)/register")({
  head: () => ({
    meta: [{ title: "Create an account — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.$get())
    if (result.ok && isSessionUser(result.data)) {
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
    const result = await readApi(
      await api.auth.register.$post({
        json: {
          fname: field(form, "fname"),
          lname: field(form, "lname"),
          email: field(form, "email"),
          phone: field(form, "phone"),
          password: field(form, "password"),
        },
      })
    )
    setPending(false)

    if (!result.ok) {
      setError(errorMessage(result.data, "Could not create the account."))
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
            <UserPlus data-icon="inline-start" />
            {pending ? "Creating account" : "Create account"}
          </Button>
          <AuthSwitch current="/register" />
        </CardFooter>
      </form>
    </Card>
  )
}
