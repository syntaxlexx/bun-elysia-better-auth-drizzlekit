import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { UserPlus } from "lucide-react"
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
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/(auth)/register")({
  head: () => ({
    meta: [{ title: "Create an account — Folio" }],
  }),
  beforeLoad: ({ context }) => {
    if (context.user) {
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
    const fname = field(form, "fname")
    const lname = field(form, "lname")
    const result = await authClient.signUp.email({
      name: `${fname} ${lname}`,
      email: field(form, "email"),
      password: field(form, "password"),
      fname,
      lname,
    })
    setPending(false)

    if (result.error) {
      setError(result.error.message ?? "Could not create the account.")
      return
    }

    await navigate({ to: "/dashboard" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Open a desk</CardTitle>
        <CardDescription>
          A name, an email address, and a password. Phone sign-in can be added
          later from the login page.
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
            <Input name="email" type="email" autoComplete="email" required />
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
