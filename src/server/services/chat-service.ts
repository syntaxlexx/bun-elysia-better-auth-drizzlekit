import { and, asc, count, desc, eq } from "drizzle-orm"
import { db } from "../db/index.ts"
import { roomMessages, roomParticipants, rooms, users } from "../db/schema.ts"
import { getAccountHold } from "./user-service.ts"
import { ServiceError } from "./errors.ts"

type UserRow = typeof users.$inferSelect
type RoomRow = typeof rooms.$inferSelect

const nameLimit = 80
const bodyLimit = 2000
const historyLimit = 100

function first<T>(rows: ReadonlyArray<T>): T | undefined {
  if (rows.length === 0) {
    return undefined
  }
  return rows[0]
}

function isPostgresError(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }
  if ("code" in error && error.code === code) {
    return true
  }
  if ("cause" in error) {
    return isPostgresError(error.cause, code)
  }
  return false
}

function assertName(name: string) {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > nameLimit) {
    throw new ServiceError(422, {
      ok: false,
      message: "Room name must be 1 to 80 characters.",
    })
  }
  return trimmed
}

async function requireStillActive(userId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const user = first(rows)
  if (!user) {
    throw new ServiceError(401, { ok: false, message: "Not signed in." })
  }
  const hold = await getAccountHold(user)
  if (hold) {
    throw new ServiceError(403, hold)
  }
  return user
}

async function selectRoom(roomId: string) {
  try {
    const rows = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1)
    return first(rows)
  } catch (error) {
    if (isPostgresError(error, "22P02")) {
      return undefined
    }
    throw error
  }
}

async function participantCount(roomId: string) {
  const rows = await db
    .select({ value: count(roomParticipants.id) })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId))
  return Number(first(rows)?.value ?? 0)
}

export async function listRooms() {
  const rows = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      createdBy: rooms.createdBy,
      createdAt: rooms.createdAt,
      updatedAt: rooms.updatedAt,
      participantCount: count(roomParticipants.id),
    })
    .from(rooms)
    .leftJoin(roomParticipants, eq(roomParticipants.roomId, rooms.id))
    .groupBy(
      rooms.id,
      rooms.name,
      rooms.createdBy,
      rooms.createdAt,
      rooms.updatedAt
    )
    .orderBy(asc(rooms.name))

  return rows.map((row) => ({
    room: {
      id: row.id,
      name: row.name,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } satisfies Pick<
      RoomRow,
      "id" | "name" | "createdBy" | "createdAt" | "updatedAt"
    >,
    participantCount: Number(row.participantCount),
  }))
}

export async function getRoom(roomId: string) {
  const room = await selectRoom(roomId)
  if (!room) {
    throw new ServiceError(404, { ok: false, message: "Room not found." })
  }
  return {
    room,
    participantCount: await participantCount(room.id),
  }
}

export async function createRoom(user: UserRow, input: { name: string }) {
  const name = assertName(input.name)
  try {
    const inserted = await db
      .insert(rooms)
      .values({
        name,
        createdBy: user.id,
        updatedAt: new Date(),
      })
      .returning()
    const room = first(inserted)
    if (!room) {
      throw new ServiceError(422, {
        ok: false,
        message: "Could not create the room.",
      })
    }
    await joinRoom(user, room.id)
    return { room, participantCount: 1 }
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error
    }
    if (isPostgresError(error, "23505")) {
      throw new ServiceError(422, {
        ok: false,
        message: "A room with that name already exists.",
      })
    }
    throw error
  }
}

export async function joinRoom(user: UserRow, roomId: string) {
  const room = await selectRoom(roomId)
  if (!room) {
    throw new ServiceError(404, { ok: false, message: "Room not found." })
  }

  const existing = await db
    .select()
    .from(roomParticipants)
    .where(
      and(
        eq(roomParticipants.roomId, room.id),
        eq(roomParticipants.userId, user.id)
      )
    )
    .limit(1)
  const current = first(existing)
  if (current) {
    return { participant: current, user }
  }

  try {
    const inserted = await db
      .insert(roomParticipants)
      .values({
        roomId: room.id,
        userId: user.id,
      })
      .returning()
    const participant = first(inserted)
    if (!participant) {
      throw new ServiceError(422, {
        ok: false,
        message: "Could not join the room.",
      })
    }
    return { participant, user }
  } catch (error) {
    if (isPostgresError(error, "23505")) {
      const again = await db
        .select()
        .from(roomParticipants)
        .where(
          and(
            eq(roomParticipants.roomId, room.id),
            eq(roomParticipants.userId, user.id)
          )
        )
        .limit(1)
      const participant = first(again)
      if (participant) {
        return { participant, user }
      }
    }
    throw error
  }
}

export async function listParticipants(roomId: string) {
  await getRoom(roomId)
  return db
    .select({
      id: roomParticipants.id,
      roomId: roomParticipants.roomId,
      userId: roomParticipants.userId,
      joinedAt: roomParticipants.joinedAt,
      fname: users.fname,
      lname: users.lname,
    })
    .from(roomParticipants)
    .innerJoin(users, eq(users.id, roomParticipants.userId))
    .where(eq(roomParticipants.roomId, roomId))
    .orderBy(asc(roomParticipants.joinedAt))
}

export async function listMessages(roomId: string) {
  await getRoom(roomId)
  const rows = await db
    .select({
      id: roomMessages.id,
      roomId: roomMessages.roomId,
      body: roomMessages.body,
      authorId: roomMessages.authorId,
      createdAt: roomMessages.createdAt,
      fname: users.fname,
      lname: users.lname,
    })
    .from(roomMessages)
    .innerJoin(users, eq(users.id, roomMessages.authorId))
    .where(eq(roomMessages.roomId, roomId))
    .orderBy(desc(roomMessages.createdAt))
    .limit(historyLimit)

  return rows.reverse()
}

export async function createMessage(
  user: UserRow,
  roomId: string,
  body: string
) {
  const current = await requireStillActive(user.id)
  const room = await selectRoom(roomId)
  if (!room) {
    throw new ServiceError(404, { ok: false, message: "Room not found." })
  }

  const trimmed = body.trim()
  if (trimmed.length < 1 || trimmed.length > bodyLimit) {
    throw new ServiceError(422, {
      ok: false,
      message: "Message must be 1 to 2000 characters.",
    })
  }

  const membership = await db
    .select({ id: roomParticipants.id })
    .from(roomParticipants)
    .where(
      and(
        eq(roomParticipants.roomId, room.id),
        eq(roomParticipants.userId, current.id)
      )
    )
    .limit(1)
  if (!first(membership)) {
    throw new ServiceError(403, {
      ok: false,
      message: "Join the room before sending a message.",
    })
  }

  const inserted = await db
    .insert(roomMessages)
    .values({
      roomId: room.id,
      authorId: current.id,
      body: trimmed,
    })
    .returning()
  const message = first(inserted)
  if (!message) {
    throw new ServiceError(422, {
      ok: false,
      message: "Could not send the message.",
    })
  }

  return {
    message,
    author: {
      id: current.id,
      fname: current.fname,
      lname: current.lname,
    },
  }
}
