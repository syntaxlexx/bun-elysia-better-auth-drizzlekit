import { hashPassword } from "better-auth/crypto"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { bridgeEmailSuffix, storedEmail } from "../auth/email.ts"
import { findLockDuration } from "../auth/lock-durations.ts"
import { db } from "../db/index.ts"
import { accountIssues, accounts, users } from "../db/schema.ts"
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
  const email = blankToNull(input.email)?.toLowerCase() ?? null
  const phone = blankToNull(input.phone)

  if (!fname || !lname) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter a first and last name.",
    })
  }
  if (!email && !phone) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter an email address or a phone number.",
    })
  }
  if (email) {
    assertEmail(email)
  }
  if (phone) {
    assertPhone(phone)
  }

  return { fname, lname, email, phone }
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

async function refusal(user: UserRow) {
  const hold = await getAccountHold(user)
  if (!hold) {
    return null
  }
  return new ServiceError(403, hold)
}

async function assertIdentityAvailable(email: string, phone: string | null) {
  const rows = await db
    .select({ id: users.id, email: users.email, phone: users.phone })
    .from(users)
    .where(
      phone
        ? or(eq(users.email, email), eq(users.phone, phone))
        : eq(users.email, email)
    )
  const taken = first(rows)
  if (!taken) {
    return
  }
  if (phone && taken.phone === phone) {
    throw new ServiceError(422, {
      ok: false,
      message: "That phone number is already registered.",
    })
  }
  throw new ServiceError(422, {
    ok: false,
    message: "That email address is already registered.",
  })
}

export async function prepareRegistration(
  input: IdentityInput & { password: string }
) {
  const identity = normalizeIdentity(input)
  assertPassword(input.password)
  const email = storedEmail(identity.email, identity.phone)
  if (!email) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter an email address or a phone number.",
    })
  }
  await assertIdentityAvailable(email, identity.phone)
  return { ...identity, email, password: input.password }
}

export async function findByIdentifier(identifier: string) {
  const value = identifier.trim()
  if (!value) {
    return null
  }
  const rows = await db
    .select()
    .from(users)
    .where(or(eq(users.email, value), eq(users.phone, value)))
    .limit(1)
  return first(rows) ?? null
}

export async function resolveLogin(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  if (!email || !input.password) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter your email and password.",
    })
  }
  assertEmail(email)

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  const user = first(rows)
  if (!user) {
    throw new ServiceError(401, {
      ok: false,
      message: "Invalid email or password.",
    })
  }

  const denied = await refusal(user)
  if (denied) {
    throw denied
  }

  return user
}

async function activeAccount(user: UserRow | null) {
  if (!user) {
    return null
  }
  const denied = await refusal(user)
  if (denied) {
    throw denied
  }
  return user
}

export async function findActiveByEmail(email: string) {
  const value = email.trim().toLowerCase()
  if (!value) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter your email address.",
    })
  }
  assertEmail(value)
  if (value.endsWith(bridgeEmailSuffix)) {
    return null
  }
  return activeAccount(await getByEmail(value))
}

export async function findActiveByPhone(phone: string) {
  const value = phone.trim()
  if (!value) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter your phone number.",
    })
  }
  assertPhone(value)
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.phone, value))
    .limit(1)
  return activeAccount(first(rows) ?? null)
}

export async function confirmRealEmail(user: UserRow) {
  // Email OTP treats an unverified address as unproven and deletes the password.
  if (user.email.endsWith(bridgeEmailSuffix) || user.emailVerified) {
    return user
  }
  const now = new Date()
  const rows = await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerifiedAt: user.emailVerifiedAt ?? now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))
    .returning()
  return first(rows) ?? user
}

export async function markPhoneVerified(userId: string) {
  const now = new Date()
  const rows = await db
    .update(users)
    .set({
      phoneNumberVerified: true,
      phoneVerifiedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning()
  return first(rows) ?? null
}

export async function getById(id: string) {
  return (await findUser(id)) ?? null
}

export async function getByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return first(rows) ?? null
}

export async function updateProfile(userId: string, input: IdentityInput) {
  const current = await requireUser(userId)
  const identity = normalizeIdentity(input)
  const email = storedEmail(identity.email, identity.phone)
  if (!email) {
    throw new ServiceError(422, {
      ok: false,
      message: "Enter an email address or a phone number.",
    })
  }

  const now = new Date()
  const realEmail = !email.endsWith(bridgeEmailSuffix)
  const sameEmail = current.email === email
  const samePhone = current.phone === identity.phone
  let emailVerifiedAt: Date | null = null
  if (realEmail) {
    emailVerifiedAt = sameEmail ? (current.emailVerifiedAt ?? now) : now
  }

  try {
    const rows = await db
      .update(users)
      .set({
        fname: identity.fname,
        lname: identity.lname,
        name: `${identity.fname} ${identity.lname}`,
        email,
        emailVerified: realEmail,
        emailVerifiedAt,
        phone: identity.phone,
        phoneNumberVerified: samePhone ? current.phoneNumberVerified : false,
        phoneVerifiedAt: samePhone ? current.phoneVerifiedAt : null,
        updatedAt: now,
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
  const password = await hashPassword(input.nextPassword)
  const now = new Date()
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.providerId, "credential"))
    )
    .limit(1)
  const existing = first(rows)
  if (!existing) {
    await db.insert(accounts).values({
      accountId: userId,
      providerId: "credential",
      userId,
      password,
    })
  } else {
    await db
      .update(accounts)
      .set({ password, updatedAt: now })
      .where(eq(accounts.id, existing.id))
  }
  await db.update(users).set({ updatedAt: now }).where(eq(users.id, userId))
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

export async function listUsers() {
  return db.select().from(users).orderBy(desc(users.createdAt))
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
