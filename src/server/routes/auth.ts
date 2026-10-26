import { Hono } from "hono"
import { z } from "zod"
import { resources } from "../api-resources/index.ts"
import { auth } from "../auth/better-auth.ts"
import { bindings } from "../auth/bindings.ts"
import { requireUser } from "../auth/guard.ts"
import { jsonBody, run } from "../http.ts"
import { ServiceError } from "../services/errors.ts"
import { takeResetLink } from "../auth/reset-link.ts"
import {
  findByIdentifier,
  getAccountHold,
  getByEmail,
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
  identifier: z.string(),
  password: z.string(),
})

const forgotBody = z.object({
  identifier: z.string(),
})

const resetBody = z.object({
  token: z.string(),
  newPassword: z.string(),
})

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
        phone: prepared.phone ?? undefined,
      },
      asResponse: true,
    })
    if (!response.ok) {
      await authFailure(response, "Could not create the account.")
    }
    const user = await getByEmail(prepared.email)
    if (!user) {
      throw new ServiceError(422, {
        ok: false,
        message: "Could not create the account.",
      })
    }
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
        message: "Invalid email, phone, or password.",
      })
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
