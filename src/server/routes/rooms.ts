import { Hono } from "hono"
import { z } from "zod"
import { resources } from "../api-resources/index.ts"
import { requireActiveUser } from "../auth/guard.ts"
import type { AuthEnv } from "../auth/guard.ts"
import { jsonBody, run } from "../http.ts"
import { publishMessage } from "../realtime/pusher.ts"
import {
  createMessage,
  createRoom,
  getRoom,
  joinRoom,
  listMessages,
  listParticipants,
  listRooms,
} from "../services/chat-service.ts"

export const roomRoutes = new Hono<AuthEnv>()
  .use("/rooms", requireActiveUser)
  .use("/rooms/*", requireActiveUser)
  .get("/rooms", (c) =>
    run(c, async () => {
      const rows = await listRooms()
      return {
        rooms: rows.map((row) =>
          resources.rooms.roomResource(row.room, row.participantCount)
        ),
      }
    })
  )
  .post("/rooms", jsonBody(z.object({ name: z.string() })), (c) =>
    run(c, async () => {
      const created = await createRoom(c.get("user"), c.req.valid("json"))
      return resources.rooms.roomResource(
        created.room,
        created.participantCount
      )
    })
  )
  .get("/rooms/:roomId", (c) =>
    run(c, async () => {
      const roomId = c.req.param("roomId")
      const [room, participants, messages] = await Promise.all([
        getRoom(roomId),
        listParticipants(roomId),
        listMessages(roomId),
      ])
      return {
        room: resources.rooms.roomResource(room.room, room.participantCount),
        participants: participants.map(resources.rooms.participantResource),
        messages: messages.map(resources.rooms.messageResource),
      }
    })
  )
  .post("/rooms/:roomId/join", (c) =>
    run(c, async () => {
      const user = c.get("user")
      const joined = await joinRoom(user, c.req.param("roomId"))
      return resources.rooms.participantResource({
        ...joined.participant,
        fname: joined.user.fname,
        lname: joined.user.lname,
      })
    })
  )
  .post(
    "/rooms/:roomId/messages",
    jsonBody(
      z.object({
        body: z.string(),
        socketId: z.string().optional(),
      })
    ),
    (c) =>
      run(c, async () => {
        const user = c.get("user")
        const roomId = c.req.param("roomId")
        const body = c.req.valid("json")
        const created = await createMessage(user, roomId, body.body)
        const message = resources.rooms.messageResource({
          ...created.message,
          fname: created.author.fname,
          lname: created.author.lname,
        })
        const socketId = body.socketId?.trim()
        try {
          await publishMessage(roomId, message, socketId ? socketId : undefined)
        } catch (error) {
          console.error(
            "Chat publish failed",
            error instanceof Error ? error.message : "unknown"
          )
        }
        return message
      })
  )
