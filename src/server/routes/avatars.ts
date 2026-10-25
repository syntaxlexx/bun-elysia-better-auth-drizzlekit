import { Elysia } from "elysia"
import { readAvatar } from "../services/avatar-service.ts"

export const avatarRoutes = new Elysia().get(
  "/avatars/:userId/:file",
  async ({ params, set }) => {
    const file = await readAvatar(params.userId, params.file)
    if (!file) {
      set.status = 404
      return { ok: false as const, message: "Avatar not found." }
    }

    return new Response(file.bytes, {
      headers: {
        "content-type": file.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    })
  }
)
