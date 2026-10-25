import { Elysia, t } from "elysia"
import { resources } from "../api-resources/index.ts"
import { requireActiveUser } from "../auth/guard.ts"
import { run } from "../http.ts"
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

export const roomRoutes = new Elysia()
  .get("/rooms", ({ request, set }) =>
    run(set, async () => {
      await requireActiveUser(request)
      const rows = await listRooms()
      return {
        rooms: rows.map((row) =>
          resources.rooms.roomResource(row.room, row.participantCount)
        ),
      }
    })
  )
  .post(
    "/rooms",
    ({ body, request, set }) =>
      run(set, async () => {
        const user = await requireActiveUser(request)
        const created = await createRoom(user, body)
        return resources.rooms.roomResource(
          created.room,
          created.participantCount
        )
      }),
    { body: t.Object({ name: t.String() }) }
  )
  .get("/rooms/:roomId", ({ params, request, set }) =>
    run(set, async () => {
      await requireActiveUser(request)
      const [room, participants, messages] = await Promise.all([
        getRoom(params.roomId),
        listParticipants(params.roomId),
        listMessages(params.roomId),
      ])
      return {
        room: resources.rooms.roomResource(room.room, room.participantCount),
        participants: participants.map(resources.rooms.participantResource),
        messages: messages.map(resources.rooms.messageResource),
      }
    })
  )
  .post("/rooms/:roomId/join", ({ params, request, set }) =>
    run(set, async () => {
      const user = await requireActiveUser(request)
      const joined = await joinRoom(user, params.roomId)
      return resources.rooms.participantResource({
        ...joined.participant,
        fname: joined.user.fname,
        lname: joined.user.lname,
      })
    })
  )
  .post(
    "/rooms/:roomId/messages",
    ({ params, body, request, set }) =>
      run(set, async () => {
        const user = await requireActiveUser(request)
        const created = await createMessage(user, params.roomId, body.body)
        const message = resources.rooms.messageResource({
          ...created.message,
          fname: created.author.fname,
          lname: created.author.lname,
        })
        const socketId = body.socketId?.trim()
        try {
          await publishMessage(
            params.roomId,
            message,
            socketId ? socketId : undefined
          )
        } catch (error) {
          console.error(
            "Chat publish failed",
            error instanceof Error ? error.message : "unknown"
          )
        }
        return message
      }),
    {
      body: t.Object({
        body: t.String(),
        socketId: t.Optional(t.String()),
      }),
    }
  )
