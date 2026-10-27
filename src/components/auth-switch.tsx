import { Link } from "@tanstack/react-router"

const methods = [
  { to: "/login", label: "Log in" },
  { to: "/register", label: "Register" },
  { to: "/phone-login", label: "Phone login" },
  { to: "/email-login", label: "Email code" },
] as const

export function AuthSwitch({
  current,
}: {
  current: (typeof methods)[number]["to"]
}) {
  const others = methods.filter((method) => method.to !== current)
  return (
    <p className="text-center text-sm text-muted-foreground">
      {others.map((method, index) => (
        <span key={method.to}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          <Link
            to={method.to}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {method.label}
          </Link>
        </span>
      ))}
    </p>
  )
}
