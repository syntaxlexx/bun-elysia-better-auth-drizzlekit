import { treaty } from "@elysiajs/eden"
import { createIsomorphicFn, createServerOnlyFn } from "@tanstack/react-start"
import { createFileRoute } from "@tanstack/react-router"
import type { App } from "@/server/app"

const handleWithApp = createServerOnlyFn(async (request: Request) => {
  const { app } = await import("@/server/app")
  return app.fetch(request)
})

const handle = ({ request }: { request: Request }) => handleWithApp(request)

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
  .server(async () => {
    const { app } = await import("@/server/app")
    return { api: treaty(app).api }
  })
  .client(() => ({ api: treaty<App>(window.location.origin).api }))
