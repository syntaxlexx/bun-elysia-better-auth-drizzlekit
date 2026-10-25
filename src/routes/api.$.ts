import { treaty } from "@elysiajs/eden"
import { createIsomorphicFn, createServerOnlyFn } from "@tanstack/react-start"
import { createFileRoute } from "@tanstack/react-router"
import { Elysia } from "elysia"

const readDatabase = createServerOnlyFn(async () => {
  const { getSql } = await import("@/server/db")
  const sql = getSql()
  const [row] = await sql<Array<{ database: string }>>`
    select current_database() as database
  `

  return {
    ok: true,
    database: row.database,
  }
})

const app = new Elysia({
  prefix: "/api",
})
  .get("/", () => "Hello Elysia!")
  .get("/ready", () => readDatabase())

const handle = ({ request }: { request: Request }) => app.fetch(request)

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
      HEAD: handle,
    },
  },
})

export const getTreaty = createIsomorphicFn()
  .server(() => treaty(app).api)
  .client(() => treaty<typeof app>(window.location.origin).api)
