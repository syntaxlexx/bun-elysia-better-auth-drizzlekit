import { createHash, randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "../db/index.ts"
import { sessions, users } from "../db/schema.ts"

const cookieName = "session"
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000

function first<T>(rows: ReadonlyArray<T>): T | undefined {
  if (rows.length === 0) {
    return undefined
  }
  return rows[0]
}

export function readCookie(header: string | null, name = cookieName) {
  if (!header) {
    return undefined
  }

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) {
      return decodeURIComponent(rest.join("="))
    }
  }

  return undefined
}

export function sessionCookie(token: string, expiresAt: Date) {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000)
  )
  return `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}`
}

export function clearSessionCookie() {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + sessionLifetimeMs)

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  })

  return { token, expiresAt }
}

export async function readSession(token: string | undefined) {
  if (!token) {
    return null
  }

  const tokenHash = createHash("sha256").update(token).digest("hex")
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1)
  const row = first(rows)

  if (!row) {
    return null
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId))
    return null
  }

  return row.user
}

export async function destroySession(token: string | undefined) {
  if (!token) {
    return
  }

  const tokenHash = createHash("sha256").update(token).digest("hex")
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
}
