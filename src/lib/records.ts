export function errorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }
  return fallback
}

export async function readApi(response: Response) {
  const data: unknown = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, data }
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—"
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString()
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "—"
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function isoDate(value: string | Date | null | undefined) {
  if (!value) {
    return undefined
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date.toISOString()
}

export function toDateTimeLocal(value: string | Date | null) {
  if (!value) {
    return ""
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const roles = ["USER", "ADMIN", "LOCKED"] as const
const statuses = ["ACTIVE", "BANNED", "SUSPENDED", "LOCKED"] as const

export type SessionUser = {
  id: string
  fname: string
  lname: string
  email: string | null
  phone: string | null
  role: (typeof roles)[number]
  status: (typeof statuses)[number]
  bannedAt: string | null
  lockedUntil: string | null
  avatarUrl: string | null
  createdAt?: string | Date
  hold?: {
    code?: string
    message?: string
    bannedAt?: string | null
    lockedUntil?: string | null
  } | null
}

export function isSessionUser(data: unknown): data is SessionUser {
  if (typeof data !== "object" || data === null) {
    return false
  }
  if (!("id" in data) || typeof data.id !== "string") {
    return false
  }
  if (!("fname" in data) || typeof data.fname !== "string") {
    return false
  }
  if (!("lname" in data) || typeof data.lname !== "string") {
    return false
  }
  if (!("role" in data) || typeof data.role !== "string") {
    return false
  }
  if (!("status" in data) || typeof data.status !== "string") {
    return false
  }
  return (
    roles.includes(data.role as SessionUser["role"]) &&
    statuses.includes(data.status as SessionUser["status"])
  )
}

function isTime(value: unknown): value is string | Date | null {
  return typeof value === "string" || value instanceof Date || value === null
}

export type PostSummary = {
  id: string
  authorId: string
  authorName: string
  title: string
  viewsCounter: number
  averageRatings: number | null
  status: "DRAFT" | "PUBLISHED"
  publishedAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

export type OwnedPost = PostSummary & {
  body: Array<Record<string, unknown>>
}

export type PostDetail = OwnedPost & {
  comments: Array<{
    id: string
    body: string
    authorId: string
    authorName: string
    createdAt: string
  }>
  rating: {
    average: number | null
    count: number
    mine: number | null
    myReview: string | null
    reviews: Array<{
      id: string
      score: number
      review: string | null
      userId: string
      authorName: string
      createdAt: string
    }>
  }
}

function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null
}

export function postState(post: Pick<PostSummary, "status" | "publishedAt">) {
  if (post.status === "DRAFT") {
    return "Draft"
  }
  if (post.publishedAt && new Date(post.publishedAt).getTime() > Date.now()) {
    return "Scheduled"
  }
  return "Published"
}

export function isPostSummary(data: unknown): data is PostSummary {
  if (!isRecord(data)) {
    return false
  }
  return (
    typeof data.id === "string" &&
    typeof data.authorId === "string" &&
    typeof data.authorName === "string" &&
    typeof data.title === "string" &&
    typeof data.viewsCounter === "number" &&
    (data.averageRatings === null || typeof data.averageRatings === "number") &&
    (data.status === "DRAFT" || data.status === "PUBLISHED") &&
    isTime(data.publishedAt) &&
    (typeof data.createdAt === "string" || data.createdAt instanceof Date) &&
    (typeof data.updatedAt === "string" || data.updatedAt instanceof Date)
  )
}

export function isPostList(data: unknown): data is Array<PostSummary> {
  return Array.isArray(data) && data.every(isPostSummary)
}

export function isOwnedPost(data: unknown): data is OwnedPost {
  return isPostSummary(data) && Array.isArray((data as { body?: unknown }).body)
}

export function isOwnedPostList(data: unknown): data is Array<OwnedPost> {
  return Array.isArray(data) && data.every(isOwnedPost)
}

export type Room = {
  id: string
  name: string
  createdBy: string | null
  participantCount: number
  createdAt: string | Date
  updatedAt: string | Date
}

export type RoomParticipant = {
  id: string
  roomId: string
  userId: string
  name: string
  joinedAt: string | Date
}

export type RoomMessage = {
  id: string
  roomId: string
  body: string
  authorId: string
  authorName: string
  createdAt: string | Date
}

export type RoomDetail = {
  room: Room
  participants: Array<RoomParticipant>
  messages: Array<RoomMessage>
}

export type RealtimeConfig = {
  key: string
  cluster: string
  host: string | null
  port: number
  forceTLS: boolean
}

export function isRoom(data: unknown): data is Room {
  return (
    isRecord(data) &&
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    (data.createdBy === null || typeof data.createdBy === "string") &&
    typeof data.participantCount === "number" &&
    isTime(data.createdAt) &&
    data.createdAt !== null &&
    isTime(data.updatedAt) &&
    data.updatedAt !== null
  )
}

export function isRoomList(data: unknown): data is { rooms: Array<Room> } {
  return isRecord(data) && Array.isArray(data.rooms) && data.rooms.every(isRoom)
}

export function isRoomParticipant(data: unknown): data is RoomParticipant {
  return (
    isRecord(data) &&
    typeof data.id === "string" &&
    typeof data.roomId === "string" &&
    typeof data.userId === "string" &&
    typeof data.name === "string" &&
    isTime(data.joinedAt) &&
    data.joinedAt !== null
  )
}

export function isRoomMessage(data: unknown): data is RoomMessage {
  return (
    isRecord(data) &&
    typeof data.id === "string" &&
    typeof data.roomId === "string" &&
    typeof data.body === "string" &&
    typeof data.authorId === "string" &&
    typeof data.authorName === "string" &&
    isTime(data.createdAt) &&
    data.createdAt !== null
  )
}

export function isRoomDetail(data: unknown): data is RoomDetail {
  return (
    isRecord(data) &&
    isRoom(data.room) &&
    Array.isArray(data.participants) &&
    data.participants.every(isRoomParticipant) &&
    Array.isArray(data.messages) &&
    data.messages.every(isRoomMessage)
  )
}

export function isRealtimeConfig(data: unknown): data is RealtimeConfig {
  return (
    isRecord(data) &&
    typeof data.key === "string" &&
    data.key.length > 0 &&
    typeof data.cluster === "string" &&
    data.cluster.length > 0 &&
    (data.host === null || typeof data.host === "string") &&
    typeof data.port === "number" &&
    typeof data.forceTLS === "boolean"
  )
}

export function isPostDetail(data: unknown): data is PostDetail {
  if (!isOwnedPost(data) || !("rating" in data) || !isRecord(data.rating)) {
    return false
  }
  return (
    "comments" in data &&
    Array.isArray(data.comments) &&
    typeof data.rating.count === "number" &&
    (data.rating.myReview === null ||
      typeof data.rating.myReview === "string") &&
    Array.isArray(data.rating.reviews)
  )
}
