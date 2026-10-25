import type { ReactNode } from "react"

export const fieldClassName =
  "border-input bg-background h-8 w-full rounded-2xl border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export const areaClassName =
  "border-input bg-background min-h-24 w-full rounded-2xl border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      {children}
    </label>
  )
}
