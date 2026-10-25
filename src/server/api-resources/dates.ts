export function iso(value: Date | null) {
  return value ? value.toISOString() : null
}
