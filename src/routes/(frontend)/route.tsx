import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SiteFooter, SiteHeader } from "@/components/site-chrome"
import { isSessionUser } from "@/lib/records"
import type { SessionUser } from "@/lib/records"
import { getTreaty } from "@api"

export const Route = createFileRoute("/(frontend)")({
  head: () => ({
    meta: [{ title: "Folio" }],
  }),
  beforeLoad: async () => {
    const { api } = await getTreaty()
    const result = await api.me.get()
    const user: SessionUser | null =
      result.error || !isSessionUser(result.data) ? null : result.data
    return { user }
  },
  component: FrontendLayout,
})

function FrontendLayout() {
  const { user } = Route.useRouteContext()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader user={user} />
      <div className="flex-1">
        <div className="container">
          <Outlet />
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
