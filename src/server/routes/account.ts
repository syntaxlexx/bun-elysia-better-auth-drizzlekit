import { Elysia, t } from "elysia"
import { requireActiveUser } from "../auth/guard.ts"
import { resources } from "../api-resources/index.ts"
import { run } from "../http.ts"
import { saveAvatar } from "../services/avatar-service.ts"
import { setPassword, updateProfile } from "../services/user-service.ts"

export const accountRoutes = new Elysia()
  .patch(
    "/me",
    ({ body, request, set }) =>
      run(set, async () => {
        const user = await requireActiveUser(request)
        return resources.users.userResource(await updateProfile(user.id, body))
      }),
    {
      body: t.Object({
        fname: t.String(),
        lname: t.String(),
        email: t.String(),
        phone: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .put(
    "/me/password",
    ({ body, request, set }) =>
      run(set, async () => {
        const user = await requireActiveUser(request)
        await setPassword(user.id, body)
        return { ok: true as const }
      }),
    {
      body: t.Object({
        nextPassword: t.String(),
      }),
    }
  )
  .post(
    "/me/avatar",
    ({ body, request, set }) =>
      run(set, async () => {
        const user = await requireActiveUser(request)
        return resources.users.userResource(
          await saveAvatar(user.id, body.avatar)
        )
      }),
    {
      body: t.Object({
        avatar: t.File(),
      }),
    }
  )
