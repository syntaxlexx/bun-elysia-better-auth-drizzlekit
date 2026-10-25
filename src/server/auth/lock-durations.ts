export const lockDurations = [
  { id: "1h", label: "1 hour", milliseconds: 60 * 60 * 1000 },
  { id: "2h", label: "2 hours", milliseconds: 2 * 60 * 60 * 1000 },
  { id: "1d", label: "1 day", milliseconds: 24 * 60 * 60 * 1000 },
  { id: "3d", label: "3 days", milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { id: "1w", label: "1 week", milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { id: "1mo", label: "1 month", milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { id: "3mo", label: "3 months", milliseconds: 90 * 24 * 60 * 60 * 1000 },
  { id: "6mo", label: "6 months", milliseconds: 180 * 24 * 60 * 60 * 1000 },
  { id: "9mo", label: "9 months", milliseconds: 270 * 24 * 60 * 60 * 1000 },
  { id: "1y", label: "1 year", milliseconds: 365 * 24 * 60 * 60 * 1000 },
] as const

export type LockDurationId = (typeof lockDurations)[number]["id"]

export function findLockDuration(id: string) {
  return lockDurations.find((duration) => duration.id === id)
}
