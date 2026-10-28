import { Elysia, t } from "elysia"
import { resources } from "../api-resources/index.ts"
import { requireAdmin } from "../auth/guard.ts"
import { run } from "../http.ts"
import { pageQuery, readPage } from "../pagination.ts"
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
  .get(
    "/admin/users",
    ({ query, request, set }) =>
      run(set, async () => {
        await requireAdmin(request)
        const page = await listUsers(readPage(query))
        return {
          items: page.items.map(resources.users.userResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
  )
  .get("/admin/users/:userId", ({ params, request, set }) =>
    run(set, async () => {
      await requireAdmin(request)
      const user = await getById(params.userId)
      if (!user) {
        set.status = 404
        return { ok: false as const, message: "User not found." }
      }
      const issues = await listAccountIssues(params.userId)
      return {
        user: resources.users.userResource(user),
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
  .get(
    "/admin/users/:userId/posts",
    ({ params, query, request, set }) =>
      run(set, async () => {
        const actor = await requireAdmin(request)
        const user = await getById(params.userId)
        if (!user) {
          set.status = 404
          return { ok: false as const, message: "User not found." }
        }
        const page = await listPostsByAuthor(
          actor,
          params.userId,
          readPage(query)
        )
        return {
          items: page.items.map(resources.posts.postPublicResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
  )
  .get(
    "/admin/posts",
    ({ query, request, set }) =>
      run(set, async () => {
        const actor = await requireAdmin(request)
        const page = await listAllPosts(actor, readPage(query))
        return {
          items: page.items.map(resources.posts.postPublicResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
  )
