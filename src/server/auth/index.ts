import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import "@tanstack/react-start/server-only"
import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { verifyPassword as verifyBetterAuthPassword } from "better-auth/crypto"
import { emailOTP, phoneNumber } from "better-auth/plugins"
import { db } from "../db/index.ts"
import * as schema from "../db/schema.ts"
import { getAccountHold, getById } from "../services/user-service.ts"
import { deliverOneTimeCode } from "./otp.ts"
import { verifyPassword as verifyLegacyPassword } from "./password.ts"

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

function phoneMailbox(phone: string) {
  const digits = phone.replaceAll(/\D/g, "")
  return `${digits}@phone.folio.local`
}

export const auth = betterAuth({
  baseURL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
    },
  }),
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    password: {
      verify: async ({ hash, password }) => {
        if (await verifyLegacyPassword(password, hash)) {
          return true
        }
        try {
          return await verifyBetterAuthPassword({ hash, password })
        } catch {
          return false
        }
      },
    },
  },
  user: {
    additionalFields: {
      fname: {
        type: "string",
        required: true,
      },
      lname: {
        type: "string",
        required: true,
      },
      role: {
        type: ["USER", "ADMIN", "LOCKED"],
        required: false,
        defaultValue: "USER",
        input: false,
      },
      status: {
        type: ["ACTIVE", "BANNED", "SUSPENDED", "LOCKED"],
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      bannedAt: {
        type: "date",
        required: false,
        input: false,
      },
      lockedUntil: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const fields = user as {
            fname?: unknown
            lname?: unknown
            name: string
          }
          const fname =
            typeof fields.fname === "string" ? fields.fname.trim() : ""
          const lname =
            typeof fields.lname === "string" ? fields.lname.trim() : ""
          const name = `${fname} ${lname}`.trim()
          return {
            data: {
              ...user,
              fname,
              lname,
              name: name.length > 0 ? name : fields.name,
            },
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await getById(session.userId)
          if (!user) {
            return
          }
          const hold = await getAccountHold(user)
          if (hold) {
            throw new APIError("FORBIDDEN", {
              message: hold.message,
              code: hold.code,
            })
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        deliverOneTimeCode("email", email, otp, type)
      },
    }),
    phoneNumber({
      sendOTP({ phoneNumber: phone, code }) {
        deliverOneTimeCode("phone", phone, code, "sign-in")
      },
      signUpOnVerification: {
        getTempEmail: phoneMailbox,
        getTempName: (phone) => phone,
      },
      phoneNumberValidator(phone) {
        return /^\+[1-9]\d{1,14}$/.test(phone)
      },
    }),
  ],
})
