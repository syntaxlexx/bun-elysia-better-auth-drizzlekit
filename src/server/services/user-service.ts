import { and, count, desc, eq, isNull } from "drizzle-orm"
import { setCredentialPassword } from "../auth/credentials.ts"
import { findLockDuration } from "../auth/lock-durations.ts"
import { db } from "../db/index.ts"
import { accountIssues, users } from "../db/schema.ts"
import { asCount, offsetFor, toPage } from "../pagination.ts"
import type { PageRequest } from "../pagination.ts"
import { ServiceError } from "./errors.ts"

type UserRow = typeof users.$inferSelect
type Role = UserRow["role"]
type Status = UserRow["status"]

type IdentityInput = {
  fname: string
  lname: string
  email?: string | null
  phone?: string | null
}

const defaultIssueMessage: Record<Exclude<Status, "ACTIVE">, string> = {
  BANNED: "This account is banned.",
  SUSPENDED: "This account is suspended.",
  LOCKED: "This account is locked.",
}

const issueKindForStatus = {
  BANNED: "BAN",
  SUSPENDED: "SUSPEND",
  LOCKED: "LOCK",
} as const

function first<T>(rows: ReadonlyArray<T>): T | undefined {
  if (rows.length === 0) {
    return undefined
  }
  return rows[0]
}

function iso(value: Date | null) {
  return value ? value.toISOString() : null
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

function assertEmail(email: string) {
  const at = email.indexOf("@")
  const domain = email.slice(at + 1)
  if (
    at <= 0 ||
    at !== email.lastIndexOf("@") ||
    domain.length === 0 ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    /\s/.test(email)
  ) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter a valid email address.",
    })
  }
}

function assertPhone(phone: string) {
  if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
    throw new ServiceError(422, {
      ok: false,
      message:
        "Enter a phone number in international format, such as +14155552671.",
    })
  }
}

function assertPassword(password: string) {
  if (password.length < 8) {
    throw new ServiceError(422, {
      ok: false,
      message: "Password must be at least 8 characters.",
    })
  }
}

function normalizeIdentity(input: IdentityInput) {
  const fname = input.fname.trim()
  const lname = input.lname.trim()
  const email = blankToNull(input.email)
  const phone = blankToNull(input.phone)

  if (!fname || !lname) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter a first and last name.",
    })
  }
  if (!email) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter an email address.",
    })
  }
  assertEmail(email)
  if (phone) {
    assertPhone(phone)
  }

  return { fname, lname, email, phone, name: `${fname} ${lname}` }
}

function isUniqueViolation(error: unknown): error is { constraint?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  )
}

function uniqueIdentityError(error: { constraint?: string }) {
  if (error.constraint?.includes("phone")) {
    return new ServiceError(422, {
      ok: false,
      message: "That phone number is already registered.",
    })
  }

  return new ServiceError(422, {
    ok: false,
    message: "That email address is already registered.",
  })
}

async function findUser(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return first(rows)
}

async function requireUser(id: string) {
  const user = await findUser(id)
  if (!user) {
    throw new ServiceError(404, { ok: false, message: "User not found." })
  }
  return user
}

async function requireActiveAdmin(actorId: string) {
  const actor = await requireUser(actorId)
  if (actor.role !== "ADMIN" || actor.status !== "ACTIVE") {
    throw new ServiceError(403, {
      ok: false,
      message: "Admin access is required.",
    })
  }
  return actor
}

export async function getAccountHold(user: UserRow) {
  const status = user.status
  if (status === "ACTIVE") {
    return null
  }

  const rows = await db
    .select()
    .from(accountIssues)
    .where(
      and(
        eq(accountIssues.userId, user.id),
        eq(accountIssues.kind, issueKindForStatus[status]),
        isNull(accountIssues.resolvedAt)
      )
    )
    .orderBy(desc(accountIssues.createdAt))
    .limit(1)
  const issue = first(rows)

  return {
    ok: false as const,
    code: status,
    message: issue?.reason ?? defaultIssueMessage[status],
    bannedAt: status === "BANNED" ? iso(user.bannedAt) : null,
    lockedUntil: status === "LOCKED" ? iso(user.lockedUntil) : null,
  }
}

export async function updateProfile(userId: string, input: IdentityInput) {
  const current = await requireUser(userId)
  const identity = normalizeIdentity(input)

  try {
    const rows = await db
      .update(users)
      .set({
        fname: identity.fname,
        lname: identity.lname,
        name: identity.name,
        email: identity.email,
        emailVerified:
          identity.email === current.email ? current.emailVerified : false,
        phoneNumber: identity.phone,
        phoneNumberVerified:
          identity.phone === current.phoneNumber
            ? current.phoneNumberVerified
            : false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()
    const user = first(rows)
    if (!user) {
      throw new ServiceError(404, { ok: false, message: "User not found." })
    }
    return user
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw uniqueIdentityError(error)
    }
    throw error
  }
}

export async function setPassword(
  userId: string,
  input: { nextPassword: string }
) {
  await requireUser(userId)
  assertPassword(input.nextPassword)
  await setCredentialPassword(userId, input.nextPassword)
}

export async function getById(id: string) {
  return findUser(id)
}

export async function adminSetPassword(
  actorId: string,
  userId: string,
  input: { nextPassword: string }
) {
  await requireActiveAdmin(actorId)
  await setPassword(userId, input)
}

const roles: Array<Role> = ["USER", "ADMIN", "LOCKED"]

export async function setRole(actorId: string, userId: string, role: Role) {
  await requireActiveAdmin(actorId)
  if (!roles.includes(role)) {
    throw new ServiceError(422, { ok: false, message: "Choose a valid role." })
  }

  const rows = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()
  const user = first(rows)
  if (!user) {
    throw new ServiceError(404, { ok: false, message: "User not found." })
  }
  return user
}

export async function setStatus(
  actorId: string,
  userId: string,
  input: { status: Status; reason?: string; lockDurationId?: string }
) {
  await requireActiveAdmin(actorId)
  const subject = await requireUser(userId)
  const now = new Date()
  const reason = input.reason?.trim() ?? ""

  if (input.status !== "ACTIVE" && !reason) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter a reason for this account action.",
    })
  }

  let lockedUntil: Date | null = null
  if (input.status === "LOCKED") {
    const duration = input.lockDurationId
      ? findLockDuration(input.lockDurationId)
      : undefined
    if (!duration) {
      throw new ServiceError(422, {
        ok: false,
        message: "Choose how long to lock the account.",
      })
    }
    lockedUntil = new Date(now.getTime() + duration.milliseconds)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(accountIssues)
      .set({ resolvedAt: now })
      .where(
        and(
          eq(accountIssues.userId, subject.id),
          isNull(accountIssues.resolvedAt)
        )
      )

    await tx
      .update(users)
      .set({
        status: input.status,
        bannedAt: input.status === "BANNED" ? now : null,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(users.id, subject.id))

    if (input.status !== "ACTIVE") {
      await tx.insert(accountIssues).values({
        userId: subject.id,
        kind: issueKindForStatus[input.status],
        reason,
        startsAt: now,
        endsAt: lockedUntil,
        createdBy: actorId,
      })
    }
  })

  const updated = await getById(subject.id)
  if (!updated) {
    throw new ServiceError(404, { ok: false, message: "User not found." })
  }
  return updated
}

export async function listUsers(request: PageRequest) {
  const totals = await db.select({ value: count() }).from(users)
  const total = asCount(totals[0]?.value)
  const offset = offsetFor(request, total)
  const items =
    total === 0
      ? []
      : await db
          .select()
          .from(users)
          .orderBy(desc(users.createdAt), desc(users.id))
          .limit(request.perPage)
          .offset(offset)
  return toPage(request, total, items)
}

export async function listAccountIssues(userId: string) {
  await requireUser(userId)
  const rows = await db
    .select()
    .from(accountIssues)
    .where(eq(accountIssues.userId, userId))
    .orderBy(desc(accountIssues.createdAt))

  return rows
}
