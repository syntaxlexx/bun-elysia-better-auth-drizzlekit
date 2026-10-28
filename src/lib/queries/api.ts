import { errorMessage } from "@/lib/records"

export function unwrap<T>(
  result: { error: unknown; data: unknown },
  guard: (data: unknown) => data is T,
  fallback: string
): T {
  if (result.error || !guard(result.data)) {
    throw new Error(errorMessage(result.error, fallback))
  }
  return result.data
}

export function reject(error: unknown, fallback: string): never {
  throw new Error(errorMessage(error, fallback))
}
