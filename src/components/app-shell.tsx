import { Link, useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { getTreaty } from "@/routes/api.$"

export function AppShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string
  subtitle?: string
  nav: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="cursor-pointer">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {title}
              </p>
              {subtitle ? (
                <p className="text-lg font-medium">{subtitle}</p>
              ) : null}
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {nav}
            <ThemeSwitcher />
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        {children}
      </main>
    </div>
  )
}

const navClassName =
  "text-foreground hover:bg-muted rounded-2xl px-3 py-1.5 text-sm"
const navActiveClassName =
  "bg-muted text-foreground rounded-2xl px-3 py-1.5 text-sm font-medium"

export function ShellLink({
  to,
  exact = false,
  children,
}: {
  to:
    | "/"
    | "/dashboard"
    | "/dashboard/chat"
    | "/dashboard/posts"
    | "/dashboard/profile"
    | "/posts"
    | "/admin/users"
    | "/admin/posts"
    | "/login"
  exact?: boolean
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className={navClassName}
      activeProps={{ className: navActiveClassName }}
    >
      {children}
    </Link>
  )
}

export function SignOutButton() {
  const navigate = useNavigate()

  async function logout() {
    const { api } = await getTreaty()
    await api.auth.logout.post()
    await navigate({ to: "/" })
  }

  return (
    <Button type="button" variant="outline" onClick={() => void logout()}>
      Log out
    </Button>
  )
}
