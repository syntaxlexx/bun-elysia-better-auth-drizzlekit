import { createMiddleware } from "hono/factory"
import type { users } from "../db/schema.ts"
import { ServiceError } from "../services/errors.ts"
import { getAccountHold, getById } from "../services/user-service.ts"
import { auth } from "./better-auth.ts"
import { bindings } from "./bindings.ts"

type UserRow = typeof users.$inferSelect

export type AuthEnv = {
  Variables: {
    user: UserRow
  }
}

export async function readActor(request: Request) {
  const session = await auth(bindings()).api.getSession({
    headers: request.headers,
  })
  if (!session) {
    return null
  }
  return getById(session.user.id)
}

async function signedInUser(request: Request) {
  const user = await readActor(request)
  if (!user) {
    throw new ServiceError(401, { ok: false, message: "Not signed in." })
  }
  return user
}

export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  c.set("user", await signedInUser(c.req.raw))
  await next()
})

export const requireActiveUser = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await signedInUser(c.req.raw)
  const hold = await getAccountHold(user)
  if (hold) {
    throw new ServiceError(403, hold)
  }
  c.set("user", user)
  await next()
})

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await signedInUser(c.req.raw)
  const hold = await getAccountHold(user)
  if (hold) {
    throw new ServiceError(403, hold)
  }
  if (user.role !== "ADMIN") {
    throw new ServiceError(403, {
      ok: false,
      message: "Admin access is required.",
    })
  }
  c.set("user", user)
  await next()
})
