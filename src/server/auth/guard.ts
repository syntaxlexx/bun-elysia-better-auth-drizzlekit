import { readCookie, readSession } from "./session.ts"
import { ServiceError } from "../services/errors.ts"
import { getAccountHold } from "../services/user-service.ts"

export async function readActor(request: Request) {
  return readSession(readCookie(request.headers.get("cookie")))
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
