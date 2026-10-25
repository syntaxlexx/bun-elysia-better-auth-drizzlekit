import { Elysia, t } from "elysia"
import { resources } from "../api-resources/index.ts"
import { requireAdmin } from "../auth/guard.ts"
import { run } from "../http.ts"
import { listAllPosts, listPostsByAuthor } from "../services/post-service.ts"
import {
  adminSetPassword,
  getById,
  listAccountIssues,
  listUsers,
  setRole,
  setStatus,
} from "../services/user-service.ts"

const role = t.Union([
  t.Literal("USER"),
  t.Literal("ADMIN"),
  t.Literal("LOCKED"),
])

const status = t.Union([
  t.Literal("ACTIVE"),
  t.Literal("BANNED"),
  t.Literal("SUSPENDED"),
  t.Literal("LOCKED"),
])

export const adminRoutes = new Elysia()
  .get("/admin/users", ({ request, set }) =>
    run(set, async () => {
      await requireAdmin(request)
      return (await listUsers()).map(resources.users.userResource)
    })
  )
  .get("/admin/users/:userId", ({ params, request, set }) =>
    run(set, async () => {
      const actor = await requireAdmin(request)
      const user = await getById(params.userId)
      if (!user) {
        set.status = 404
        return { ok: false as const, message: "User not found." }
      }
      const [userPosts, issues] = await Promise.all([
        listPostsByAuthor(actor, params.userId),
        listAccountIssues(params.userId),
      ])
      return {
        user: resources.users.userResource(user),
        posts: userPosts.map(resources.posts.postPublicResource),
        issues: issues.map(resources.accountIssues.accountIssueResource),
      }
    })
  )
  .put(
    "/admin/users/:userId/role",
    ({ params, body, request, set }) =>
      run(set, async () => {
        const actor = await requireAdmin(request)
        return resources.users.userResource(
          await setRole(actor.id, params.userId, body.role)
        )
      }),
    {
      body: t.Object({ role }),
    }
  )
  .put(
    "/admin/users/:userId/password",
    ({ params, body, request, set }) =>
      run(set, async () => {
        const actor = await requireAdmin(request)
        await adminSetPassword(actor.id, params.userId, body)
        return { ok: true as const }
      }),
    {
      body: t.Object({ nextPassword: t.String() }),
    }
  )
  .put(
    "/admin/users/:userId/status",
    ({ params, body, request, set }) =>
      run(set, async () => {
        const actor = await requireAdmin(request)
        return resources.users.userResource(
          await setStatus(actor.id, params.userId, body)
        )
      }),
    {
      body: t.Object({
        status,
        reason: t.Optional(t.String()),
        lockDurationId: t.Optional(t.String()),
      }),
    }
  )
  .get("/admin/posts", ({ request, set }) =>
    run(set, async () => {
      const actor = await requireAdmin(request)
      return (await listAllPosts(actor)).map(resources.posts.postPublicResource)
    })
  )
