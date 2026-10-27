import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { LogIn, Smartphone } from "lucide-react"
import { useState } from "react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { AuthSwitch } from "@/components/auth-switch"
import { OtpSignIn, readCode } from "@/components/otp-sign-in"
import { errorMessage, isSessionUser, readApi } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/(auth)/phone-login")({
  head: () => ({
    meta: [{ title: "Phone login — Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await readApi(await api.me.$get())
    if (result.ok && isSessionUser(result.data)) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: PhoneLoginPage,
})

function PhoneLoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState<string>()

  return (
    <OtpSignIn
      title="Phone login"
      description="Enter the phone number on your Folio account. We'll send a 6-digit code."
      identifierLabel="Phone"
      identifierType="tel"
      autoComplete="tel"
      changeLabel="Use a different phone number"
      identifierValue={phone ?? ""}
      identifierField={
        <div className="flex flex-col gap-1 text-sm">
          <span id="phone-login-label">Phone</span>
          <PhoneInput
            international
            defaultCountry="US"
            limitMaxLength
            countryCallingCodeEditable={false}
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            aria-labelledby="phone-login-label"
            className="phone-input"
          />
        </div>
      }
      sendIcon={Smartphone}
      verifyIcon={LogIn}
      footer={<AuthSwitch current="/phone-login" />}
      onSend={async (phone) => {
        const { api } = await getTreaty()
        const result = await readApi(
          await api.auth.phone["send-otp"].$post({ json: { phone } })
        )
        if (!result.ok) {
          return {
            ok: false,
            message: errorMessage(result.data, "Could not send a code."),
          }
        }
        return { ok: true, previewCode: readCode(result.data) }
      }}
      onVerify={async (phone, code) => {
        const { api } = await getTreaty()
        const result = await readApi(
          await api.auth.phone.verify.$post({ json: { phone, code } })
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
