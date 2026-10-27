import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { LogIn, Mail } from "lucide-react"
import { AuthSwitch } from "@/components/auth-switch"
import { OtpSignIn, readCode } from "@/components/otp-sign-in"
import { errorMessage, isSessionUser, readApi } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/(auth)/email-login")({
  head: () => ({
    meta: [{ title: "Email code — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.$get())
    if (result.ok && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: EmailLoginPage,
})

function EmailLoginPage() {
  const navigate = useNavigate()

  return (
    <OtpSignIn
      title="Email code"
      description="Enter the email on your Folio account. We'll send a 6-digit code."
      identifierLabel="Email"
      identifierType="email"
      autoComplete="email"
      changeLabel="Use a different email"
      sendIcon={Mail}
      verifyIcon={LogIn}
      footer={<AuthSwitch current="/email-login" />}
      onSend={async (email) => {
        const { api } = await getTreaty()
        const result = await readApi(
          await api.auth["email-otp"].send.$post({ json: { email } })
        )
        if (!result.ok) {
          return {
            ok: false,
            message: errorMessage(result.data, "Could not send a code."),
          }
        }
        return { ok: true, previewCode: readCode(result.data) }
      }}
      onVerify={async (email, code) => {
        const { api } = await getTreaty()
        const result = await readApi(
          await api.auth["email-otp"].verify.$post({ json: { email, code } })
        )
        if (!result.ok) {
          return {
            ok: false,
            message: errorMessage(
              result.data,
              "That code is invalid or expired."
            ),
          }
        }
        await navigate({ to: "/dashboard" })
        return { ok: true }
      }}
    />
  )
}
