import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
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
import { adminUserQuery, setUserRole, userKeys } from "@/lib/queries/users"
import type { UserRole } from "@/lib/queries/users"

export const Route = createFileRoute("/admin/users/$userId/roles")({
  component: RolesPage,
})

function isRole(value: FormDataEntryValue | null): value is UserRole {
  return value === "USER" || value === "ADMIN" || value === "LOCKED"
}

function RolesPage() {
  const { userId } = Route.useParams()
  const { data } = useSuspenseQuery(adminUserQuery(userId))
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (role: UserRole) => setUserRole(data.user.id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    save.reset()
    const role = new FormData(event.currentTarget).get("role")
    if (!isRole(role)) {
      setFormError("Choose a valid role.")
      return
    }
    save.mutate(role)
  }

  const failure =
    formError ?? (save.error instanceof Error ? save.error.message : null)

  return (
    <Card>
      <form key={data.user.role} onSubmit={onSubmit}>
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
              defaultValue={data.user.role}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </Field>
          {failure ? (
            <p className="text-sm text-destructive">{failure}</p>
          ) : null}
          {save.isSuccess ? <p className="text-sm">Role saved.</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={save.isPending}>
            Save role
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
