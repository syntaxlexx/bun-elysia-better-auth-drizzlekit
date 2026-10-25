import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"
import { Elysia } from "elysia"
import { db } from "./db/index.ts"

export const app = new Elysia({
  prefix: "/api",
})
  .get("/", () => "Hello Elysia!")
  .get("/ready", async () => {
    const rows = await db.execute<{ database: string }>(
      sql`select current_database() as database`
    )

    return {
      ok: true as const,
      database: rows[0].database,
    }
  })

export type App = typeof app
