import { Hono } from "hono"
import { z } from "zod"
import { resources } from "../api-resources/index.ts"
import { requireAdmin } from "../auth/guard.ts"
import type { AuthEnv } from "../auth/guard.ts"
import { jsonBody, run } from "../http.ts"
import { ServiceError } from "../services/errors.ts"
import { listAllPosts, listPostsByAuthor } from "../services/post-service.ts"
import {
  adminSetPassword,
  getById,
  listAccountIssues,
  listUsers,
  setRole,
  setStatus,
} from "../services/user-service.ts"

const role = z.union([
  z.literal("USER"),
  z.literal("ADMIN"),
  z.literal("LOCKED"),
])

const status = z.union([
  z.literal("ACTIVE"),
  z.literal("BANNED"),
  z.literal("SUSPENDED"),
  z.literal("LOCKED"),
])

export const adminRoutes = new Hono<AuthEnv>()
  .use("/admin/*", requireAdmin)
  .get("/admin/users", (c) =>
    run(c, async () => (await listUsers()).map(resources.users.userResource))
  )
  .get("/admin/users/:userId", (c) =>
    run(c, async () => {
      const actor = c.get("user")
      const userId = c.req.param("userId")
      const user = await getById(userId)
      if (!user) {
        throw new ServiceError(404, { ok: false, message: "User not found." })
      }
      const [userPosts, issues] = await Promise.all([
        listPostsByAuthor(actor, userId),
        listAccountIssues(userId),
      ])
      return {
        user: resources.users.userResource(user),
        posts: userPosts.map(resources.posts.postPublicResource),
        issues: issues.map(resources.accountIssues.accountIssueResource),
      }
    })
  )
  .put("/admin/users/:userId/role", jsonBody(z.object({ role })), (c) =>
    run(c, async () => {
      const actor = c.get("user")
      return resources.users.userResource(
        await setRole(actor.id, c.req.param("userId"), c.req.valid("json").role)
      )
    })
  )
  .put(
    "/admin/users/:userId/password",
    jsonBody(z.object({ nextPassword: z.string() })),
    (c) =>
      run(c, async () => {
        const actor = c.get("user")
        await adminSetPassword(
          actor.id,
          c.req.param("userId"),
          c.req.valid("json")
        )
        return { ok: true as const }
      })
  )
  .put(
    "/admin/users/:userId/status",
    jsonBody(
      z.object({
        status,
        reason: z.string().optional(),
        lockDurationId: z.string().optional(),
      })
    ),
    (c) =>
      run(c, async () => {
        const actor = c.get("user")
        return resources.users.userResource(
          await setStatus(actor.id, c.req.param("userId"), c.req.valid("json"))
        )
      })
  )
  .get("/admin/posts", (c) =>
    run(c, async () => {
      const actor = c.get("user")
      return (await listAllPosts(actor)).map(resources.posts.postPublicResource)
    })
  )
