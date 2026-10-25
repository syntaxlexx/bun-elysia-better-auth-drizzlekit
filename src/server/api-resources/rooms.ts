import { users } from "./users.ts"

type RoomRow = {
  id: string
  name: string
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

type ParticipantRow = {
  id: string
  roomId: string
  userId: string
  joinedAt: Date
  fname: string
  lname: string
}

type MessageRow = {
  id: string
  roomId: string
  body: string
  authorId: string
  createdAt: Date
  fname: string
  lname: string
}

export const rooms = {
  roomResource: (room: RoomRow, participantCount: number) => ({
    id: room.id,
    name: room.name,
    createdBy: room.createdBy,
    participantCount,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }),
  participantResource: (row: ParticipantRow) => ({
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    name: users.publicUserResource(row).name,
    joinedAt: row.joinedAt.toISOString(),
  }),
  messageResource: (row: MessageRow) => ({
    id: row.id,
    roomId: row.roomId,
    body: row.body,
    authorId: row.authorId,
    authorName: users.publicUserResource({
      id: row.authorId,
      fname: row.fname,
      lname: row.lname,
    }).name,
    createdAt: row.createdAt.toISOString(),
  }),
}
