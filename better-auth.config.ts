import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { betterAuthOptions } from "./src/server/auth/options.ts"
import * as schema from "./src/server/db/schema.ts"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const queryClient = postgres(databaseUrl)
const db = drizzle(queryClient, { schema })

export const auth = betterAuth({
  ...betterAuthOptions,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
    },
  }),
  advanced: {
    database: { generateId: "uuid" },
  },
})
