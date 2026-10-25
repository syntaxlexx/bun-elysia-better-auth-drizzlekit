import { Elysia, t } from "elysia"
import {
  clearSessionCookie,
  destroySession,
  readCookie,
  readSession,
  sessionCookie,
} from "../auth/session.ts"
import { ServiceError } from "../services/errors.ts"
import {
  getAccountHold,
  login,
  register,
  toPublicUser,
} from "../services/user-service.ts"

export const authRoutes = new Elysia()
  .post(
    "/auth/register",
    async ({ body, set }) => {
      try {
        const result = await register(body)
        set.headers["set-cookie"] = sessionCookie(
          result.token,
          result.expiresAt
        )
        return { ok: true as const, user: result.user }
      } catch (error) {
        if (error instanceof ServiceError) {
          set.status = error.status
          return error.body
        }
        throw error
      }
    },
    {
      body: t.Object({
        fname: t.String(),
        lname: t.String(),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        password: t.String(),
      }),
    }
  )
  .post(
    "/auth/login",
    async ({ body, set }) => {
      try {
        const result = await login(body)
        set.headers["set-cookie"] = sessionCookie(
          result.token,
          result.expiresAt
        )
        return { ok: true as const, user: result.user }
      } catch (error) {
        if (error instanceof ServiceError) {
          set.status = error.status
          return error.body
        }
        throw error
      }
    },
    {
      body: t.Object({
        identifier: t.String(),
        password: t.String(),
      }),
    }
  )
  .post("/auth/logout", async ({ request, set }) => {
    const token = readCookie(request.headers.get("cookie"))
    await destroySession(token)
    set.headers["set-cookie"] = clearSessionCookie()
    return { ok: true as const }
  })
  .get("/me", async ({ request, set }) => {
    const token = readCookie(request.headers.get("cookie"))
    const user = await readSession(token)
    if (!user) {
      set.status = 401
      return { ok: false as const, message: "Not signed in." }
    }
    return { ...toPublicUser(user), hold: await getAccountHold(user) }
  })
