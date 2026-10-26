export type AuthBindings = {
  DATABASE_URL: string
  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
}

export function bindings(): AuthBindings {
  const databaseUrl = process.env.DATABASE_URL ?? ""
  const url = process.env.BETTER_AUTH_URL ?? ""
  const secret = process.env.BETTER_AUTH_SECRET ?? ""
  if (!databaseUrl || !url || secret.length < 32) {
    throw new Error(
      "DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET (32+ characters) must be set."
    )
  }
  return {
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: url,
    BETTER_AUTH_SECRET: secret,
  }
}
