import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"
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

type StepResult = { ok: true } | { ok: false; message: string }

export function readCode(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string"
  ) {
    return data.code
  }
  return null
}

export function OtpSignIn({
  title,
  description,
  identifierLabel,
  identifierType,
  autoComplete,
  placeholder,
  changeLabel,
  sendIcon: SendIcon,
  verifyIcon: VerifyIcon,
  identifierField,
  identifierValue,
  onSend,
  onVerify,
  footer,
}: {
  title: string
  description: string
  identifierLabel: string
  identifierType: "email" | "tel"
  autoComplete: string
  placeholder?: string
  changeLabel: string
  sendIcon: LucideIcon
  verifyIcon: LucideIcon
  identifierField?: ReactNode
  identifierValue?: string
  onSend: (
    identifier: string
  ) => Promise<StepResult & { previewCode?: string | null }>
  onVerify: (identifier: string, code: string) => Promise<StepResult>
  footer: ReactNode
}) {
  const [identifier, setIdentifier] = useState("")
  const [sent, setSent] = useState(false)
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPreviewCode(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const value = form.get("identifier")
    const next =
      identifierValue !== undefined
        ? identifierValue.trim()
        : typeof value === "string"
          ? value.trim()
          : ""
    const result = await onSend(next)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setIdentifier(next)
    setPreviewCode(result.previewCode ?? null)
    setSent(true)
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const value = form.get("code")
    const code = typeof value === "string" ? value.trim() : ""
    const result = await onVerify(identifier, code)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {sent ? (
        <form onSubmit={verify}>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{identifier}</p>
            <Field label="Code">
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
            </Field>
            {previewCode ? (
              <Alert>
                <AlertTitle>Your code is {previewCode}</AlertTitle>
                <AlertDescription>
                  SMS and mail are not configured here, so use this code. It
                  expires in five minutes.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>
                  If that account exists, a code is ready.
                </AlertTitle>
                <AlertDescription>
                  Enter the 6-digit code. It expires in five minutes.
                </AlertDescription>
              </Alert>
            )}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" disabled={pending}>
              <VerifyIcon data-icon="inline-start" />
              {pending ? "Signing in" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSent(false)
                setError(null)
                setPreviewCode(null)
              }}
            >
              <ArrowLeft data-icon="inline-start" />
              {changeLabel}
            </Button>
            {footer}
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={send}>
          <CardContent className="flex flex-col gap-3">
            {identifierField ?? (
              <Field label={identifierLabel}>
                <Input
                  name="identifier"
                  type={identifierType}
                  inputMode={identifierType}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  defaultValue={identifier}
                  required
                />
              </Field>
            )}
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Button type="submit" disabled={pending}>
              <SendIcon data-icon="inline-start" />
              {pending ? "Sending" : "Send code"}
            </Button>
            {footer}
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
