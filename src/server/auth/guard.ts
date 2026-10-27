import { eq } from "drizzle-orm"
import { db } from "../db/index.ts"
import { users } from "../db/schema.ts"
import { ServiceError } from "../services/errors.ts"
import { getAccountHold } from "../services/user-service.ts"
import { auth } from "./index.ts"

export async function readActor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return null
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
  return rows[0] ?? null
}

export async function requireUser(request: Request) {
  const user = await readActor(request)
  if (!user) {
    throw new ServiceError(401, { ok: false, message: "Not signed in." })
  }
  return user
}

export async function requireActiveUser(request: Request) {
  const user = await requireUser(request)
  const hold = await getAccountHold(user)
  if (hold) {
    throw new ServiceError(403, hold)
  }
  return user
}

export async function requireAdmin(request: Request) {
  const user = await requireActiveUser(request)
  if (user.role !== "ADMIN") {
    throw new ServiceError(403, {
      ok: false,
      message: "Admin access is required.",
    })
  }
  return user
}
