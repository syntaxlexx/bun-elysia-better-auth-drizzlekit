import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { BrandMark } from "@/components/site-chrome"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/(auth)")({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <BrandMark tone="inverse" />
        <div className="flex max-w-md flex-col gap-4">
          <p className="font-heading text-4xl font-medium tracking-tight text-balance">
            Write in private. Publish when it is ready.
          </p>
          <p className="text-primary-foreground/80">
            Drafts stay on your desk. The shelf only shows what you have
            published.
          </p>
        </div>
        <figure className="flex max-w-sm flex-col gap-2">
          <blockquote className="text-sm text-primary-foreground/80">
            “The draft can stay unfinished. The published piece should not.”
          </blockquote>
          <figcaption className="text-sm font-medium">Folio studio</figcaption>
        </figure>
      </aside>
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <Button variant="ghost" nativeButton={false} render={<Link to="/" />}>
            Back home
          </Button>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
