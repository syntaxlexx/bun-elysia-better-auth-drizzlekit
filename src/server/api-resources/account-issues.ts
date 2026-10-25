import type { accountIssues as accountIssuesTable } from "../db/schema.ts"
import { iso } from "./dates.ts"

type AccountIssueRow = typeof accountIssuesTable.$inferSelect

export const accountIssues = {
  accountIssueResource: (issue: AccountIssueRow) => ({
    id: issue.id,
    userId: issue.userId,
    kind: issue.kind,
    reason: issue.reason,
    startsAt: issue.startsAt.toISOString(),
    endsAt: iso(issue.endsAt),
    createdBy: issue.createdBy,
    resolvedAt: iso(issue.resolvedAt),
    createdAt: issue.createdAt.toISOString(),
  }),
}
