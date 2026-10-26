import { Hono } from "hono"
import { readAvatar } from "../services/avatar-service.ts"

export const avatarRoutes = new Hono().get(
  "/avatars/:userId/:file",
  async (c) => {
    const file = await readAvatar(c.req.param("userId"), c.req.param("file"))
    if (!file) {
      return c.json({ ok: false as const, message: "Avatar not found." }, 404)
    }

    return new Response(file.bytes, {
      headers: {
        "content-type": file.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    })
  }
)
