import { hc } from "hono/client"
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
    const [{ app }, { getRequest }] = await Promise.all([
      import("@/server/app"),
      import("@tanstack/react-start/server"),
    ])
    const cookie = getRequest().headers.get("cookie")
    const client = hc<App>("http://tanstack.local", {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        app.request(input, init),
      headers: cookie ? { cookie } : undefined,
    })
    return { api: client.api }
  })
  .client(() => ({
    api: hc<App>(window.location.origin, {
      init: { credentials: "include" },
    }).api,
  }))
