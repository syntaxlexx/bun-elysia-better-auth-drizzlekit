import type { BetterAuthOptions } from "better-auth"
import { rememberResetLink } from "./reset-link.ts"

const origin = process.env.BETTER_AUTH_URL ?? ""

export const betterAuthOptions = {
  appName: "Folio",
  basePath: "/api/auth",
  trustedOrigins: origin ? [origin] : [],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: ({ user, url }) => {
      rememberResetLink(user.email, url)
      if (process.env.NODE_ENV !== "production") {
        console.info(`Password reset link for ${user.email}: ${url}`)
      }
      return Promise.resolve()
    },
  },
  session: {
    modelName: "sessions",
    expiresIn: 60 * 60 * 24 * 30,
  },
  account: {
    modelName: "accounts",
  },
  verification: {
    modelName: "verifications",
  },
  user: {
    modelName: "users",
    additionalFields: {
      fname: { type: "string", required: true },
      lname: { type: "string", required: true },
      phone: { type: "string", required: false },
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      bannedAt: { type: "date", required: false, input: false },
      lockedUntil: { type: "date", required: false, input: false },
      avatarUrl: { type: "string", required: false, input: false },
      phoneVerifiedAt: { type: "date", required: false, input: false },
    },
  },
} satisfies BetterAuthOptions
