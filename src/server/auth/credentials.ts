import "@tanstack/react-start/server-only"
import { ServiceError } from "../services/errors.ts"

export async function setCredentialPassword(
  userId: string,
  nextPassword: string
) {
  if (nextPassword.length < 8) {
    throw new ServiceError(422, {
      ok: false,
      message: "Password must be at least 8 characters.",
    })
  }

  const { auth } = await import("./index.ts")
  const context = await auth.$context
  const password = await context.password.hash(nextPassword)
  const existing = await context.internalAdapter.findCredentialAccount(userId)

  if (existing) {
    await context.internalAdapter.updatePassword(userId, password)
    return
  }

  await context.internalAdapter.linkAccount({
    userId,
    accountId: userId,
    providerId: "credential",
    password,
  })
}
