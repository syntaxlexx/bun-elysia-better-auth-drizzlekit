import "@tanstack/react-start/server-only"
import postgres from "postgres"

let client: ReturnType<typeof postgres> | undefined

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }

  client ??= postgres(url, { max: 10 })
  return client
}
