import { Elysia, t } from "elysia"
import { requireActiveUser } from "../auth/guard.ts"
import { run } from "../http.ts"
import {
  getPusher,
  realtimePublicConfig,
  roomIdFromChannel,
} from "../realtime/pusher.ts"
import { joinRoom } from "../services/chat-service.ts"
import { ServiceError } from "../services/errors.ts"

export const realtimeRoutes = new Elysia()
  .get("/realtime/config", ({ request, set }) =>
    run(set, async () => {
      await requireActiveUser(request)
      return realtimePublicConfig()
    })
  )
  .post(
    "/realtime/auth",
    ({ body, request, set }) =>
      run(set, async () => {
        const user = await requireActiveUser(request)
        const roomId = roomIdFromChannel(body.channelName)
        if (!roomId) {
          throw new ServiceError(403, {
            ok: false,
            message: "That channel is not available.",
          })
        }
        await joinRoom(user, roomId)
        const auth = getPusher().authorizeChannel(
          body.socketId,
          body.channelName,
          {
            user_id: user.id,
            user_info: { name: `${user.fname} ${user.lname}` },
          }
        )
        return {
          auth: auth.auth,
          channel_data: auth.channel_data,
        }
      }),
    {
      body: t.Object({
        socketId: t.String(),
        channelName: t.String(),
      }),
    }
  )
