import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Field, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { errorMessage } from "@/lib/records"
import { getTreaty } from "../../../api.$"

export const Route = createFileRoute("/admin/users/$userId/roles")({
  component: RolesPage,
})

function RolesPage() {
  const router = useRouter()
  const { detail } = Route.useRouteContext()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const role = form.get("role")
    if (role !== "USER" && role !== "ADMIN" && role !== "LOCKED") {
      setError("Choose a valid role.")
      return
    }
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.admin
      .users({ userId: detail.user.id })
      .role.put({ role })
    setPending(false)
    if (result.error) {
      setError(errorMessage(result.error, "Could not update the role."))
      return
    }
    setMessage("Role saved.")
    await router.invalidate()
  }

  return (
    <Card>
      <form key={detail.user.role} onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>Manage Roles</CardTitle>
          <CardDescription>
            LOCKED is a role label. It does not block sign-in. Use Account
            Issues to lock the account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Role">
            <select
              className={fieldClassName}
              name="role"
              defaultValue={detail.user.role}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm">{message}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            Save role
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
