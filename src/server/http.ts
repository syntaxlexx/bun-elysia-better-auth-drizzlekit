import type { Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import type { z } from "zod"
import { ServiceError } from "./services/errors.ts"

function validationMessage(error: { issues: Array<{ message?: string }> }) {
  return error.issues[0]?.message ?? "Invalid input."
}

export function jsonBody<T extends z.ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        { ok: false as const, message: validationMessage(result.error) },
        422
      )
    }
  })
}

export function formBody<T extends z.ZodType>(schema: T) {
  return zValidator("form", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        { ok: false as const, message: validationMessage(result.error) },
        422
      )
    }
  })
}

export async function run(c: Context, work: () => Promise<unknown>) {
  try {
    return c.json(await work())
  } catch (error) {
    if (error instanceof ServiceError) {
      return c.json(error.body, error.status as 401 | 403 | 404 | 422 | 503)
    }
    throw error
  }
}
