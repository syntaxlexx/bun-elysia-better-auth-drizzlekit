import { Hono } from "hono"
import { z } from "zod"
import { resources } from "../api-resources/index.ts"
import { auth } from "../auth/better-auth.ts"
import { bindings } from "../auth/bindings.ts"
import { requireUser } from "../auth/guard.ts"
import { jsonBody, run } from "../http.ts"
import { ServiceError } from "../services/errors.ts"
import { devOtp } from "../auth/otp-code.ts"
import { takeResetLink } from "../auth/reset-link.ts"
import {
  confirmRealEmail,
  findActiveByEmail,
  findActiveByPhone,
  findByIdentifier,
  getAccountHold,
  getByEmail,
  markPhoneVerified,
  prepareRegistration,
  resolveLogin,
} from "../services/user-service.ts"

const registerBody = z.object({
  fname: z.string(),
  lname: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string(),
})

const loginBody = z.object({
  email: z.string(),
  password: z.string(),
})

const phoneBody = z.object({
  phone: z.string(),
})

const phoneVerifyBody = phoneBody.extend({
  code: z.string(),
})

const emailOtpBody = z.object({
  email: z.string(),
})

const emailOtpVerifyBody = emailOtpBody.extend({
  code: z.string(),
})

const forgotBody = z.object({
  identifier: z.string(),
})

const resetBody = z.object({
  token: z.string(),
  newPassword: z.string(),
})

function assertCode(code: string) {
  if (!/^\d{6}$/.test(code)) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter the 6-digit code.",
    })
  }
}

function sentCode(message: string, key: string) {
  const code = devOtp(key)
  return {
    ok: true as const,
    message,
    ...(code ? { code } : {}),
  }
}

function jsonWithCookies(source: Response, body: unknown) {
  const headers = new Headers({ "content-type": "application/json" })
  for (const cookie of source.headers.getSetCookie()) {
    headers.append("set-cookie", cookie)
  }
  return new Response(JSON.stringify(body), { status: 200, headers })
}

async function authFailure(response: Response, fallback: string) {
  const payload: unknown = await response.json().catch(() => null)
  const message =
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
      ? payload.message
      : fallback
  const status =
    response.status === 401 || response.status === 403 ? response.status : 422
  throw new ServiceError(status, { ok: false, message })
}

export const authRoutes = new Hono()
  .post("/auth/register", jsonBody(registerBody), async (c) => {
    const prepared = await prepareRegistration(c.req.valid("json"))
    const response = await auth(bindings()).api.signUpEmail({
      body: {
        name: `${prepared.fname} ${prepared.lname}`,
        email: prepared.email,
        password: prepared.password,
        fname: prepared.fname,
        lname: prepared.lname,
        ...(prepared.phone ? { phoneNumber: prepared.phone } : {}),
      },
      asResponse: true,
    })
    if (!response.ok) {
      await authFailure(response, "Could not create the account.")
    }
    const created = await getByEmail(prepared.email)
    if (!created) {
      throw new ServiceError(422, {
        ok: false,
        message: "Could not create the account.",
      })
    }
    const user = await confirmRealEmail(created)
    return jsonWithCookies(response, {
      ok: true,
      user: resources.users.userResource(user),
    })
  })
  .post("/auth/login", jsonBody(loginBody), async (c) => {
    const body = c.req.valid("json")
    const user = await resolveLogin(body)
    const response = await auth(bindings()).api.signInEmail({
      body: { email: user.email, password: body.password },
      asResponse: true,
    })
    if (!response.ok) {
      throw new ServiceError(401, {
        ok: false,
        message: "Invalid email or password.",
      })
    }
    return jsonWithCookies(response, {
      ok: true,
      user: resources.users.userResource(user),
    })
  })
  .post("/auth/phone/send-otp", jsonBody(phoneBody), async (c) => {
    const message = "If that phone number is on an account, a code is ready."
    const user = await findActiveByPhone(c.req.valid("json").phone)
    if (!user?.phone) {
      return c.json({ ok: true as const, message })
    }
    const response = await auth(bindings()).api.sendPhoneNumberOTP({
      body: { phoneNumber: user.phone },
      asResponse: true,
    })
    if (!response.ok) {
      await authFailure(response, "Could not send a code.")
    }
    return c.json(sentCode(message, `phone:${user.phone}`))
  })
  .post("/auth/phone/verify", jsonBody(phoneVerifyBody), async (c) => {
    const body = c.req.valid("json")
    const code = body.code.trim()
    assertCode(code)
    const user = await findActiveByPhone(body.phone)
    if (!user?.phone) {
      throw new ServiceError(401, {
        ok: false,
        message: "That code is invalid or expired.",
      })
    }
    const response = await auth(bindings()).api.verifyPhoneNumber({
      body: { phoneNumber: user.phone, code },
      asResponse: true,
    })
    if (!response.ok) {
      await authFailure(response, "That code is invalid or expired.")
    }
    const verified = await markPhoneVerified(user.id)
    if (!verified) {
      throw new ServiceError(422, {
        ok: false,
        message: "Could not sign in.",
      })
    }
    return jsonWithCookies(response, {
      ok: true,
      user: resources.users.userResource(verified),
    })
  })
  .post("/auth/email-otp/send", jsonBody(emailOtpBody), async (c) => {
    const message = "If that email is on an account, a code is ready."
    const user = await findActiveByEmail(c.req.valid("json").email)
    if (!user) {
      return c.json({ ok: true as const, message })
    }
    const response = await auth(bindings()).api.sendVerificationOTP({
      body: { email: user.email, type: "sign-in" },
      asResponse: true,
    })
    if (!response.ok) {
      await authFailure(response, "Could not send a code.")
    }
    return c.json(sentCode(message, `email:${user.email.toLowerCase()}`))
  })
  .post("/auth/email-otp/verify", jsonBody(emailOtpVerifyBody), async (c) => {
    const body = c.req.valid("json")
    const code = body.code.trim()
    assertCode(code)
    const user = await findActiveByEmail(body.email)
    if (!user) {
      throw new ServiceError(401, {
        ok: false,
        message: "That code is invalid or expired.",
      })
    }
    const response = await auth(bindings()).api.signInEmailOTP({
      body: { email: user.email, otp: code },
      asResponse: true,
    })
    if (!response.ok) {
      await authFailure(response, "That code is invalid or expired.")
    }
    return jsonWithCookies(response, {
      ok: true,
      user: resources.users.userResource(user),
    })
  })
  .post("/auth/forgot-password", jsonBody(forgotBody), async (c) => {
    const identifier = c.req.valid("json").identifier.trim()
    if (!identifier) {
      throw new ServiceError(422, {
        ok: false,
        message: "Enter your email or phone number.",
      })
    }
    const user = await findByIdentifier(identifier)
    if (user) {
      const response = await auth(bindings()).api.requestPasswordReset({
        body: {
          email: user.email,
          redirectTo: `${bindings().BETTER_AUTH_URL}/reset-password`,
        },
        asResponse: true,
      })
      if (!response.ok) {
        await authFailure(response, "Could not start a password reset.")
      }
    }
    const resetUrl =
      user && process.env.NODE_ENV !== "production"
        ? takeResetLink(user.email)
        : null
    return c.json({
      ok: true as const,
      message: "If that account exists, a reset link is ready.",
      ...(resetUrl ? { resetUrl } : {}),
    })
  })
  .post("/auth/reset-password", jsonBody(resetBody), async (c) => {
    const body = c.req.valid("json")
    if (body.token.trim().length === 0) {
      throw new ServiceError(422, {
        ok: false,
        message: "This reset link is invalid or expired.",
      })
    }
    if (body.newPassword.length < 8) {
      throw new ServiceError(422, {
        ok: false,
        message: "Password must be at least 8 characters.",
      })
    }
    const response = await auth(bindings()).api.resetPassword({
      body: { newPassword: body.newPassword, token: body.token },
      asResponse: true,
    })
    if (!response.ok) {
      throw new ServiceError(422, {
        ok: false,
        message: "This reset link is invalid or expired.",
      })
    }
    return c.json({ ok: true as const })
  })
  .post("/auth/logout", async (c) =>
    auth(bindings()).api.signOut({
      headers: c.req.raw.headers,
      asResponse: true,
    })
  )
  .get("/me", requireUser, (c) =>
    run(c, async () => {
      const user = c.get("user")
      return {
        ...resources.users.userResource(user),
        hold: await getAccountHold(user),
      }
    })
  )
