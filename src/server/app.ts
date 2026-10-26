import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"
import { Hono } from "hono"
import { auth } from "./auth/better-auth.ts"
import { bindings } from "./auth/bindings.ts"
import { db } from "./db/index.ts"
import { accountRoutes } from "./routes/account.ts"
import { adminRoutes } from "./routes/admin.ts"
import { authRoutes } from "./routes/auth.ts"
import { avatarRoutes } from "./routes/avatars.ts"
import { postRoutes } from "./routes/posts.ts"
import { realtimeRoutes } from "./routes/realtime.ts"
import { roomRoutes } from "./routes/rooms.ts"
import { ServiceError } from "./services/errors.ts"

export const app = new Hono()
  .basePath("/api")
  .get("/", (c) => c.text("Hello Hono!"))
  .route("/", authRoutes)
  .route("/", accountRoutes)
  .route("/", adminRoutes)
  .route("/", postRoutes)
  .route("/", avatarRoutes)
  .route("/", roomRoutes)
  .route("/", realtimeRoutes)
  .on(["GET", "POST"], "/auth/*", (c) => auth(bindings()).handler(c.req.raw))
  .get("/ready", async (c) => {
    const rows = await db.execute<{ database: string }>(
      sql`select current_database() as database`
    )
    return c.json({
      ok: true as const,
      database: rows[0]?.database,
    })
  })

app.onError((error, c) => {
  if (error instanceof ServiceError) {
    return c.json(error.body, error.status as 401 | 403 | 404 | 422 | 503)
  }
  console.error(error)
  return c.json({ ok: false as const, message: "Internal server error." }, 500)
})

export type App = typeof app
