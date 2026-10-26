import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { db } from "../db/index.ts"
import * as schema from "../db/schema.ts"
import { getAccountHold, getById } from "../services/user-service.ts"
import type { AuthBindings } from "./bindings.ts"
import { betterAuthOptions } from "./options.ts"

const authSchema = {
  users: schema.users,
  sessions: schema.sessions,
  accounts: schema.accounts,
  verifications: schema.verifications,
}

function createAuth(env: AuthBindings) {
  return betterAuth({
    ...betterAuthOptions,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    advanced: {
      database: { generateId: "uuid" },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await getById(session.userId)
            if (!user) {
              throw new APIError("UNAUTHORIZED", {
                message: "Not signed in.",
              })
            }
            const hold = await getAccountHold(user)
            if (hold) {
              throw new APIError("FORBIDDEN", hold)
            }
          },
        },
      },
    },
  })
}

let cached: ReturnType<typeof createAuth> | undefined

export function auth(env: AuthBindings) {
  cached ??= createAuth(env)
  return cached
}
