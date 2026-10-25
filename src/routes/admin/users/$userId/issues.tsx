import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Field, areaClassName, fieldClassName } from "@/components/field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { errorMessage, formatTime } from "@/lib/records"
import { getTreaty } from "@api"

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

function IssuesPage() {
  const router = useRouter()
  const { detail } = Route.useRouteContext()
  const [action, setAction] = useState("SUSPENDED")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const status = form.get("status")
    if (
      status !== "ACTIVE" &&
      status !== "BANNED" &&
      status !== "SUSPENDED" &&
      status !== "LOCKED"
    ) {
      setError("Choose an account action.")
      return
    }
    const reason = form.get("reason")
    const lockDurationId = form.get("lockDurationId")
    setPending(true)
    const { api } = await getTreaty()
    const result = await api.admin
      .users({ userId: detail.user.id })
      .status.put({
        status,
        reason: typeof reason === "string" ? reason : "",
        lockDurationId:
          status === "LOCKED" && typeof lockDurationId === "string"
            ? lockDurationId
            : undefined,
      })
    setPending(false)
    if (result.error) {
      setError(errorMessage(result.error, "Could not update the account."))
      return
    }
    event.currentTarget.reset()
    setAction("SUSPENDED")
    await router.invalidate()
  }

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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving" : "Apply"}
            </Button>
          </CardContent>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No account issues.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {detail.issues.map((issue) => (
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
