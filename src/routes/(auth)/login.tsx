import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { cn } from "cn"
import { Eye, EyeOff, KeyRound, Mail, Smartphone } from "lucide-react"
import { useState } from "react"
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import "react-phone-number-input/style.css"
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

export const Route = createFileRoute("/(auth)/login")({
  head: () => ({
    meta: [{ title: "Log in — Folio" }],
  }),
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: LoginPage,
})

type Method = "email" | "code" | "phone"

const phoneInputClassName =
  "flex h-8 w-full min-w-0 items-center rounded-2xl border border-transparent bg-input/50 px-2.5 text-base text-foreground transition-[color,box-shadow] duration-200 [--PhoneInput-color--focus:var(--ring)] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 md:text-sm [&_input]:h-full [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-inherit [&_input]:outline-none [&_input]:placeholder:text-muted-foreground"

function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-8", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1/2 right-1 -translate-y-1/2"
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff /> : <Eye />}
        <span className="sr-only">
          {visible ? "Hide password" : "Show password"}
        </span>
      </Button>
    </div>
  )
}

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
  const [phone, setPhone] = useState<string | undefined>()

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
    if (!phone || !isValidPhoneNumber(phone)) {
      setError("Enter a valid phone number.")
      return
    }
    setPending(true)
    const phoneNumber = phone
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
              <PasswordInput
                name="password"
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
              <div className="flex flex-col gap-1 text-sm">
                <label htmlFor="login-phone">Phone</label>
                <PhoneInput
                  international
                  defaultCountry="US"
                  countryCallingCodeEditable={false}
                  limitMaxLength
                  flags={flags}
                  autoComplete="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(value) => {
                    setPhone(value)
                    setPhoneForCode((current) =>
                      value && value === current ? current : ""
                    )
                  }}
                  numberInputProps={{ id: "login-phone" }}
                  className={phoneInputClassName}
                />
              </div>
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
                A new number opens an account.
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
