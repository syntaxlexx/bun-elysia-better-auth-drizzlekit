import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SiteFooter, SiteHeader } from "@/components/site-chrome"

export const Route = createFileRoute("/(frontend)")({
  head: () => ({
    meta: [{ title: "Folio" }],
  }),
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
