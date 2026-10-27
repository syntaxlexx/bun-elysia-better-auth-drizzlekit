import { Elysia } from "elysia"
import { resources } from "../api-resources/index.ts"
import { readActor } from "../auth/guard.ts"
import { getAccountHold } from "../services/user-service.ts"

export const authRoutes = new Elysia().get("/me", async ({ request }) => {
  const user = await readActor(request)
  // Guests are a normal result. A 401 is logged by the browser on every probe.
  if (!user) {
    return null
  }
  return {
    ...resources.users.userResource(user),
    hold: await getAccountHold(user),
  }
})
