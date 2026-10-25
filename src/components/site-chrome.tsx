import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { Feather, Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { SessionUser } from "@/lib/records"
import { getTreaty } from "@/routes/api.$"
import { cn } from "cn"

const links = [
  { to: "/", label: "Home", exact: true },
  { to: "/about", label: "About", exact: false },
  { to: "/contact", label: "Contact", exact: false },
  { to: "/posts", label: "Posts", exact: false },
] as const

export function BrandMark({
  tone = "default",
}: {
  tone?: "default" | "inverse"
}) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 font-heading text-base font-medium",
        tone === "inverse" ? "text-primary-foreground" : "text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-2xl",
          tone === "inverse"
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground"
        )}
      >
        <Feather className="size-4" />
      </span>
      Folio
    </Link>
  )
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const navigate = useNavigate()
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  async function logout() {
    setPending(true)
    const { api } = await getTreaty()
    await api.auth.logout.post()
    await router.invalidate()
    setPending(false)
    setOpen(false)
    await navigate({ to: "/" })
  }

  return (
    <header className="sticky top-0 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <BrandMark />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <SiteLink key={link.to} {...link} />
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <AccountActions user={user} pending={pending} onLogout={logout} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open ? (
        <div className="border-t border-border md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((link) => (
              <SiteLink key={link.to} {...link} />
            ))}
            <Separator className="my-2" />
            <div className="flex flex-col gap-2">
              <AccountActions user={user} pending={pending} onLogout={logout} />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

function SiteLink({
  to,
  label,
  exact,
}: {
  to: (typeof links)[number]["to"]
  label: string
  exact: boolean
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="rounded-2xl px-3 py-1.5 text-sm hover:bg-muted"
      activeProps={{ className: "bg-muted font-medium text-foreground" }}
      inactiveProps={{
        className: "text-muted-foreground hover:text-foreground",
      }}
    >
      {label}
    </Link>
  )
}

function AccountActions({
  user,
  pending,
  onLogout,
}: {
  user: SessionUser | null
  pending: boolean
  onLogout: () => void
}) {
  if (!user) {
    return (
      <>
        <Button
          nativeButton={false}
          render={<Link to="/login" />}
          variant="ghost"
        >
          Log in
        </Button>
        <Button nativeButton={false} render={<Link to="/register" />}>
          Create account
        </Button>
      </>
    )
  }

  const desk = user.status === "ACTIVE" ? "/dashboard" : "/account-status"

  return (
    <>
      <p className="px-1 text-sm text-muted-foreground">
        {user.fname} {user.lname}
      </p>
      <Button
        nativeButton={false}
        render={<Link to={desk} />}
        variant="outline"
      >
        {user.status === "ACTIVE" ? "Dashboard" : "Account"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={onLogout}
      >
        {pending ? "Signing out" : "Log out"}
      </Button>
    </>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-3">
            <BrandMark />
            <p className="max-w-sm text-sm text-muted-foreground">
              A quiet desk for drafts, scheduled pieces, and a public shelf.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
          </nav>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">Folio</p>
      </div>
    </footer>
  )
}
