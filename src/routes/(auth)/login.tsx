import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { KeyRound, Mail, Smartphone } from "lucide-react"
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
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "@api"

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

type Method = "email" | "code" | "phone"

function field(form: FormData, name: string) {
  const value = form.get(name)
  return typeof value === "string" ? value : ""
}

function LoginPage() {
  const navigate = useNavigate()
  const [method, setMethod] = useState<Method>("email")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [emailForCode, setEmailForCode] = useState("")
  const [phoneForCode, setPhoneForCode] = useState("")

  async function onEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const result = await authClient.signIn.email({
      email: field(form, "email"),
      password: field(form, "password"),
    })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Could not sign in.")
      return
    }
    await navigate({ to: "/dashboard" })
  }

  async function sendEmailCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const email = field(form, "email")
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Could not send the email code.")
      return
    }
    setEmailForCode(email)
    setNotice("Check the server log for the email code, then enter it below.")
  }

  async function onEmailCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const result = await authClient.signIn.emailOtp({
      email: emailForCode,
      otp: field(form, "otp"),
    })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Could not sign in with that code.")
      return
    }
    await navigate({ to: "/dashboard" })
  }

  async function sendPhoneCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const phoneNumber = field(form, "phone")
    const result = await authClient.phoneNumber.sendOtp({ phoneNumber })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Could not send the phone code.")
      return
    }
    setPhoneForCode(phoneNumber)
    setNotice("Check the server log for the phone code, then enter it below.")
  }

  async function onPhoneCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const fname = field(form, "fname")
    const lname = field(form, "lname")
    const result = await authClient.phoneNumber.verify({
      phoneNumber: phoneForCode,
      code: field(form, "code"),
      fname,
      lname,
      name: `${fname} ${lname}`,
    })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Could not sign in with that code.")
      return
    }
    await navigate({ to: "/dashboard" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in with your email and password, an email code, or a phone code.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={method === "email" ? "default" : "outline"}
            onClick={() => {
              setMethod("email")
              setError(null)
              setNotice(null)
            }}
          >
            <KeyRound data-icon="inline-start" />
            Email
          </Button>
          <Button
            type="button"
            variant={method === "code" ? "default" : "outline"}
            onClick={() => {
              setMethod("code")
              setError(null)
              setNotice(null)
            }}
          >
            <Mail data-icon="inline-start" />
            Code
          </Button>
          <Button
            type="button"
            variant={method === "phone" ? "default" : "outline"}
            onClick={() => {
              setMethod("phone")
              setError(null)
              setNotice(null)
            }}
          >
            <Smartphone data-icon="inline-start" />
            Phone
          </Button>
        </div>

        {method === "email" ? (
          <form className="flex flex-col gap-3" onSubmit={onEmail}>
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
            <Button type="submit" disabled={pending}>
              <KeyRound data-icon="inline-start" />
              {pending ? "Signing in" : "Log in"}
            </Button>
          </form>
        ) : null}

        {method === "code" ? (
          <div className="flex flex-col gap-3">
            <form className="flex flex-col gap-3" onSubmit={sendEmailCode}>
              <Field label="Email">
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={emailForCode}
                  required
                />
              </Field>
              <Button type="submit" variant="outline" disabled={pending}>
                <Mail data-icon="inline-start" />
                {pending ? "Sending" : "Send email code"}
              </Button>
            </form>
            {emailForCode ? (
              <form className="flex flex-col gap-3" onSubmit={onEmailCode}>
                <Field label="Email code">
                  <Input
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </Field>
                <Button type="submit" disabled={pending}>
                  <KeyRound data-icon="inline-start" />
                  {pending ? "Signing in" : "Log in with code"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Email codes sign in an account that already uses that address.
              </p>
            )}
          </div>
        ) : null}

        {method === "phone" ? (
          <div className="flex flex-col gap-3">
            <form className="flex flex-col gap-3" onSubmit={sendPhoneCode}>
              <Field label="Phone">
                <Input
                  name="phone"
                  autoComplete="tel"
                  placeholder="+14155552671"
                  defaultValue={phoneForCode}
                  required
                />
              </Field>
              <Button type="submit" variant="outline" disabled={pending}>
                <Smartphone data-icon="inline-start" />
                {pending ? "Sending" : "Send phone code"}
              </Button>
            </form>
            {phoneForCode ? (
              <form className="flex flex-col gap-3" onSubmit={onPhoneCode}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name">
                    <Input name="fname" autoComplete="given-name" required />
                  </Field>
                  <Field label="Last name">
                    <Input name="lname" autoComplete="family-name" required />
                  </Field>
                </div>
                <Field label="Phone code">
                  <Input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </Field>
                <Button type="submit" disabled={pending}>
                  <Smartphone data-icon="inline-start" />
                  {pending ? "Signing in" : "Log in with phone"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                A new number opens an account. Use international format.
              </p>
            )}
          </div>
        ) : null}

        {notice ? (
          <p className="text-sm text-muted-foreground">{notice}</p>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not sign in</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter>
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
    </Card>
  )
}
