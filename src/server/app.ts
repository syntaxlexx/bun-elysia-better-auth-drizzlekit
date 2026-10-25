import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"
import { Elysia } from "elysia"
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker"
import { db } from "./db/index.ts"
import { accountRoutes } from "./routes/account.ts"
import { adminRoutes } from "./routes/admin.ts"
import { authRoutes } from "./routes/auth.ts"
import { avatarRoutes } from "./routes/avatars.ts"
import { postRoutes } from "./routes/posts.ts"
import { realtimeRoutes } from "./routes/realtime.ts"
import { roomRoutes } from "./routes/rooms.ts"

export const app = new Elysia({
  prefix: "/api",
  adapter: CloudflareAdapter,
})
  .get("/", () => "Hello Elysia!")
  .use(authRoutes)
  .use(accountRoutes)
  .use(adminRoutes)
  .use(postRoutes)
  .use(avatarRoutes)
  .use(roomRoutes)
  .use(realtimeRoutes)
  .get("/ready", async () => {
    const rows = await db.execute<{ database: string }>(
      sql`select current_database() as database`
    )

    return {
      ok: true as const,
      database: rows[0].database,
    }
  })
  .compile()

export type App = typeof app
