import { Hono } from "hono"
import { z } from "zod"
import { requireActiveUser } from "../auth/guard.ts"
import type { AuthEnv } from "../auth/guard.ts"
import { jsonBody, run } from "../http.ts"
import {
  getPusher,
  realtimePublicConfig,
  roomIdFromChannel,
} from "../realtime/pusher.ts"
import { joinRoom } from "../services/chat-service.ts"
import { ServiceError } from "../services/errors.ts"

export const realtimeRoutes = new Hono<AuthEnv>()
  .use("/realtime/*", requireActiveUser)
  .get("/realtime/config", (c) =>
    run(c, () => Promise.resolve(realtimePublicConfig()))
  )
  .post(
    "/realtime/auth",
    jsonBody(
      z.object({
        socketId: z.string(),
        channelName: z.string(),
      })
    ),
    (c) =>
      run(c, async () => {
        const user = c.get("user")
        const body = c.req.valid("json")
        const roomId = roomIdFromChannel(body.channelName)
        if (!roomId) {
          throw new ServiceError(403, {
            ok: false,
            message: "That channel is not available.",
          })
        }
        await joinRoom(user, roomId)
        const channelAuth = getPusher().authorizeChannel(
          body.socketId,
          body.channelName,
          {
            user_id: user.id,
            user_info: { name: `${user.fname} ${user.lname}` },
          }
        )
        return {
          auth: channelAuth.auth,
          channel_data: channelAuth.channel_data,
        }
      })
  )
