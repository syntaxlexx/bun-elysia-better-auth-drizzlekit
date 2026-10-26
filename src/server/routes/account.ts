import { Hono } from "hono"
import { z } from "zod"
import { resources } from "../api-resources/index.ts"
import { requireActiveUser } from "../auth/guard.ts"
import type { AuthEnv } from "../auth/guard.ts"
import { formBody, jsonBody, run } from "../http.ts"
import { saveAvatar } from "../services/avatar-service.ts"
import { setPassword, updateProfile } from "../services/user-service.ts"

const profileBody = z.object({
  fname: z.string(),
  lname: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
})

const avatarBody = z.object({
  avatar: z.instanceof(File),
})

export const accountRoutes = new Hono<AuthEnv>()
  .use("/me", requireActiveUser)
  .use("/me/*", requireActiveUser)
  .patch("/me", jsonBody(profileBody), (c) =>
    run(c, async () => {
      const user = c.get("user")
      return resources.users.userResource(
        await updateProfile(user.id, c.req.valid("json"))
      )
    })
  )
  .put("/me/password", jsonBody(z.object({ nextPassword: z.string() })), (c) =>
    run(c, async () => {
      const user = c.get("user")
      await setPassword(user.id, c.req.valid("json"))
      return { ok: true as const }
    })
  )
  .post("/me/avatar", formBody(avatarBody), (c) =>
    run(c, async () => {
      const user = c.get("user")
      return resources.users.userResource(
        await saveAvatar(user.id, c.req.valid("form").avatar)
      )
    })
  )
