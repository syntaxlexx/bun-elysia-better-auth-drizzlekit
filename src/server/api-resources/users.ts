import type { users as usersTable } from "../db/schema.ts"
import { iso } from "./dates.ts"

type UserRow = typeof usersTable.$inferSelect

export type PublicUserName = Pick<UserRow, "id" | "fname" | "lname">

function fullName(user: Pick<UserRow, "fname" | "lname">) {
  return `${user.fname} ${user.lname}`
}

export const users = {
  userResource: (user: UserRow) => ({
    id: user.id,
    fname: user.fname,
    lname: user.lname,
    email: user.email,
    phone: user.phone,
    emailVerifiedAt: iso(user.emailVerifiedAt),
    phoneVerifiedAt: iso(user.phoneVerifiedAt),
    role: user.role,
    status: user.status,
    bannedAt: iso(user.bannedAt),
    lockedUntil: iso(user.lockedUntil),
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  }),
  publicUserResource: (user: PublicUserName) => ({
    id: user.id,
    fname: user.fname,
    lname: user.lname,
    name: fullName(user),
  }),
}
