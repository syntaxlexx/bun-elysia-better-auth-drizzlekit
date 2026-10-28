import { queryOptions } from "@tanstack/react-query"
import { redirect } from "@tanstack/react-router"
import { getTreaty } from "@api"
import { isPostList, isSessionUser } from "@/lib/records"
import type { PostSummary, SessionUser } from "@/lib/records"
import { reject, unwrap } from "@/lib/queries/api"

const issueKinds = ["BAN", "SUSPEND", "LOCK"] as const

export type AdminIssue = {
  id: string
  kind: (typeof issueKinds)[number]
  reason: string
  startsAt: string
  endsAt: string | null
  resolvedAt: string | null
  createdAt: string
}

export type AdminUserDetail = {
  user: SessionUser
  posts: Array<PostSummary>
  issues: Array<AdminIssue>
}

export type UserRole = "USER" | "ADMIN" | "LOCKED"

export type AccountStatus = "ACTIVE" | "BANNED" | "SUSPENDED" | "LOCKED"

export type ProfileWrite = {
  fname: string
  lname: string
  email: string
  phone: string
}

export const userKeys = {
  all: ["users"] as const,
  list: ["users", "list"] as const,
  me: ["users", "me"] as const,
  detail: (userId: string) => ["users", "detail", userId] as const,
}

function isIssue(data: unknown): data is AdminIssue {
  if (typeof data !== "object" || data === null) {
    return false
  }
  if (!("id" in data) || typeof data.id !== "string") {
    return false
  }
  if (!("kind" in data) || typeof data.kind !== "string") {
    return false
  }
  if (!("reason" in data) || typeof data.reason !== "string") {
    return false
  }
  return issueKinds.includes(data.kind as AdminIssue["kind"])
}

export function adminUsersQuery() {
  return queryOptions({
    queryKey: userKeys.list,
    queryFn: async () => {
      const { api } = await getTreaty()
      const result = await api.admin.users.get()
      if (result.error || !Array.isArray(result.data)) {
        throw new Error("Could not load users.")
      }
      return result.data.filter(isSessionUser)
    },
  })
}

export function adminUserQuery(userId: string) {
  return queryOptions({
    queryKey: userKeys.detail(userId),
    queryFn: async (): Promise<AdminUserDetail> => {
      const { api } = await getTreaty()
      const result = await api.admin.users({ userId }).get()
      if (
        result.error ||
        typeof result.data !== "object" ||
        !("user" in result.data) ||
        !isSessionUser(result.data.user) ||
        !("posts" in result.data) ||
        !isPostList(result.data.posts) ||
        !("issues" in result.data) ||
        !Array.isArray(result.data.issues)
      ) {
        throw redirect({ to: "/admin/users" })
      }
      return {
        user: result.data.user,
        posts: result.data.posts,
        issues: result.data.issues.filter(isIssue),
      }
    },
  })
}

export function meQuery() {
  return queryOptions({
    queryKey: userKeys.me,
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.me.get(),
        isSessionUser,
        "Could not load your profile."
      )
    },
  })
}

export async function updateProfile(input: ProfileWrite) {
  const { api } = await getTreaty()
  const result = await api.me.patch(input)
  if (result.error) {
    reject(result.error, "Could not update profile.")
  }
}

export async function changePassword(nextPassword: string) {
  const { api } = await getTreaty()
  const result = await api.me.password.put({ nextPassword })
  if (result.error) {
    reject(result.error, "Could not change password.")
  }
}

export async function uploadAvatar(avatar: File) {
  const { api } = await getTreaty()
  const result = await api.me.avatar.post({ avatar })
  if (result.error) {
    reject(result.error, "Could not upload the image.")
  }
}

export async function setUserRole(userId: string, role: UserRole) {
  const { api } = await getTreaty()
  const result = await api.admin.users({ userId }).role.put({ role })
  if (result.error) {
    reject(result.error, "Could not update the role.")
  }
}

export async function setUserPassword(userId: string, nextPassword: string) {
  const { api } = await getTreaty()
  const result = await api.admin
    .users({ userId })
    .password.put({ nextPassword })
  if (result.error) {
    reject(result.error, "Could not set the password.")
  }
}

export async function setUserStatus(
  userId: string,
  input: {
    status: AccountStatus
    reason: string
    lockDurationId?: string
  }
) {
  const { api } = await getTreaty()
  const result = await api.admin.users({ userId }).status.put(input)
  if (result.error) {
    reject(result.error, "Could not update the account.")
  }
}
