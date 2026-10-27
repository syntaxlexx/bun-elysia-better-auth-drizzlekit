import type { SessionUser } from "@/lib/records"
import { isSessionUser } from "@/lib/records"
import { getTreaty } from "@api"

let pending: Promise<SessionUser | null> | null = null

async function fetchSessionUser() {
  const { api } = await getTreaty()
  const result = await api.me.get()
  if (result.error || !isSessionUser(result.data)) {
    return null
  }
  return result.data
}

export function loadSessionUser() {
  if (typeof window === "undefined") {
    return fetchSessionUser()
  }
  pending ??= fetchSessionUser().finally(() => {
    pending = null
  })
  return pending
}
