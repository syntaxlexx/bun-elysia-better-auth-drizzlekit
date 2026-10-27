import { Elysia } from "elysia"
import { resources } from "../api-resources/index.ts"
import { readActor } from "../auth/guard.ts"
import { getAccountHold } from "../services/user-service.ts"

export const authRoutes = new Elysia().get("/me", async ({ request, set }) => {
  const user = await readActor(request)
  if (!user) {
    set.status = 401
    return { ok: false as const, message: "Not signed in." }
  }
  return {
    ...resources.users.userResource(user),
    hold: await getAccountHold(user),
  }
})
