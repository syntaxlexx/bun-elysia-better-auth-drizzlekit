import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Field, areaClassName, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminUserQuery, setUserStatus, userKeys } from "@/lib/queries/users"
import type { AccountStatus } from "@/lib/queries/users"
import { formatTime } from "@/lib/records"

const durations = [
  ["1h", "1 hour"],
  ["2h", "2 hours"],
  ["1d", "1 day"],
  ["3d", "3 days"],
  ["1w", "1 week"],
  ["1mo", "1 month"],
  ["3mo", "3 months"],
  ["6mo", "6 months"],
  ["9mo", "9 months"],
  ["1y", "1 year"],
] as const

export const Route = createFileRoute("/admin/users/$userId/issues")({
  component: IssuesPage,
})

function isStatus(value: FormDataEntryValue | null): value is AccountStatus {
  return (
    value === "ACTIVE" ||
    value === "BANNED" ||
    value === "SUSPENDED" ||
    value === "LOCKED"
  )
}

function IssuesPage() {
  const { userId } = Route.useParams()
  const { data } = useSuspenseQuery(adminUserQuery(userId))
  const queryClient = useQueryClient()
  const [action, setAction] = useState("SUSPENDED")
  const [formError, setFormError] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (input: {
      status: AccountStatus
      reason: string
      lockDurationId?: string
    }) => setUserStatus(data.user.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    save.reset()
    const form = event.currentTarget
    const body = new FormData(form)
    const status = body.get("status")
    if (!isStatus(status)) {
      setFormError("Choose an account action.")
      return
    }
    const reason = body.get("reason")
    const lockDurationId = body.get("lockDurationId")
    save.mutate(
      {
        status,
        reason: typeof reason === "string" ? reason : "",
        lockDurationId:
          status === "LOCKED" && typeof lockDurationId === "string"
            ? lockDurationId
            : undefined,
      },
      {
        onSuccess: () => {
          form.reset()
          setAction("SUSPENDED")
        },
      }
    )
  }

  const failure =
    formError ?? (save.error instanceof Error ? save.error.message : null)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={onSubmit}>
          <CardHeader>
            <CardTitle>Account Issues</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Action">
              <select
                className={fieldClassName}
                name="status"
                value={action}
                onChange={(event) => setAction(event.target.value)}
              >
                <option value="BANNED">Ban</option>
                <option value="SUSPENDED">Suspend</option>
                <option value="LOCKED">Lock</option>
                <option value="ACTIVE">Restore to active</option>
              </select>
            </Field>
            {action === "LOCKED" ? (
              <Field label="Lock duration">
                <select
                  className={fieldClassName}
                  name="lockDurationId"
                  required
                >
                  {durations.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            {action === "ACTIVE" ? null : (
              <Field label="Reason">
                <textarea className={areaClassName} name="reason" required />
              </Field>
            )}
            {failure ? (
              <p className="text-sm text-destructive">{failure}</p>
            ) : null}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving" : "Apply"}
            </Button>
          </CardContent>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No account issues.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.issues.map((issue) => (
                <li
                  key={issue.id}
                  className="rounded-2xl border border-border p-3 text-sm"
                >
                  <p className="font-medium">
                    {issue.kind}
                    {issue.resolvedAt ? " · resolved" : " · open"}
                  </p>
                  <p className="mt-1">{issue.reason}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Started {formatTime(issue.startsAt)}
                    {issue.endsAt ? ` · ends ${formatTime(issue.endsAt)}` : ""}
                    {issue.resolvedAt
                      ? ` · resolved ${formatTime(issue.resolvedAt)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
