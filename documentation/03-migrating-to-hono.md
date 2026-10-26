# Migrate Elysia to Hono

This file is the source of truth for replacing Elysia with Hono and moving sign-in onto [Better Auth](https://www.better-auth.com/docs). Follow the phases in order. Product behavior from [overview.md](./overview.md) and [02-live-chat.md](./02-live-chat.md) stays: same JSON bodies, same status codes, same page gates. This file replaces the “do not add Better Auth” decision in the overview.

The auth wiring follows [Better Auth on Cloudflare](https://hono.dev/examples/better-auth-on-cloudflare): an `auth(env)` factory, Drizzle adapter, and `app.on(..., handler)`. This app is still a TanStack Start process. `vp dev --port 3000` stays the only server. Do not replace it with `wrangler dev`.

## What moves, and what stays

Elysia is the HTTP adapter in two files and the route modules under `src/server/routes/`. Eden Treaty is the client, exported as `getTreaty()` from `src/routes/api.$.ts`. Sessions are the `sessions` table plus `src/server/auth/session.ts` and `src/server/auth/password.ts` (`node:crypto` scrypt).

Hono replaces Elysia. The [Hono RPC client](https://hono.dev/docs/guides/rpc) (`hc`) replaces Eden. Better Auth replaces the session row, the scrypt hash, and the register, login, and logout handlers. Services, Drizzle domain tables, Pusher, and the React pages stay. Pages still must not import `db`.

| Keep                                                         | Replace                                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/server/services/*`, `src/server/auth/lock-durations.ts` | `elysia`, `@elysiajs/eden`, `Elysia` route classes                                                 |
| `src/server/auth/guard.ts`, rewritten as Hono middleware     | A `requireActiveUser(request)` call inside every handler                                           |
| Posts, comments, ratings, rooms, account issues              | `users.password_hash` and the custom `sessions` row                                                |
| `GET /api/me` and every non-auth route                       | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` as hand-rolled handlers |
| `postgres` pool in `src/server/db/index.ts` for `vp dev`     | A new Neon client on the Node path                                                                 |

`GET /api` returns the text `Hello Hono!`. `GET /api/ready` still returns `{ ok: true, database: "elysia_tanstart" }`.

## Do not copy the example verbatim

The example is an auth-only Worker. Four choices in that page would break this app. Use the rest of the example as written.

| Example                                                         | This app                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `basePath: '/api'` and `app.on(['GET', 'POST'], '/api/*', ...)` | `basePath: '/api/auth'`. Mount `'/api/auth/*'`. A mount on `/api/*` sends posts, rooms, and avatars into Better Auth.                      |
| `new Hono()` as the Worker entry, `export default app`          | TanStack Start stays the entry. `src/routes/api.$.ts` still forwards `request` to `app.fetch(request)`. Hono’s `fetch` is that method.     |
| `@neondatabase/serverless` inside `auth(env)` on every call     | Node uses the existing `postgres` pool. Neon is the driver only when the same factory runs on Workers, where `postgres` has no TCP socket. |
| CLI `--output ./src/db/schema.ts`                               | Generate beside the schema, then merge. That command would overwrite posts, rooms, and the enums.                                          |

Register the three Folio auth routes before the wildcard. Hono uses the first match.

```ts
app.post("/api/auth/register", register)
app.post("/api/auth/login", login)
app.post("/api/auth/logout", logout)
app.on(["GET", "POST"], "/api/auth/*", (c) =>
  auth(bindings(c)).handler(c.req.raw)
)
```

`/api/auth/sign-in/email`, `/api/auth/sign-up/email`, `/api/auth/sign-out`, and `/api/auth/get-session` belong to Better Auth. Folio’s `/api/auth/login`, `/api/auth/register`, and `/api/auth/logout` stay so the current pages keep their paths. Those three handlers call `auth.api.*` and return its `Response`.

## Packages

```bash
vp install hono @hono/zod-validator zod better-auth
vp remove elysia @elysiajs/eden
```

Use `vp install` / `vp remove`. Do not add `tsx`.

Environment, in `.env`, next to the existing `DATABASE_URL`:

```
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
```

`BETTER_AUTH_SECRET` is at least 32 characters. `BETTER_AUTH_URL` is the origin the browser uses, with no path. On a Worker, set the same three names as secrets, which is the example’s `.dev.vars` / Worker secrets split. `PUSHER_*` is unchanged.

## App

Replace `src/server/app.ts` with one Hono app. The prefix matches today’s `new Elysia({ prefix: "/api" })`.

```ts
import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"
import { Hono } from "hono"
import { db } from "./db/index.ts"
import { auth } from "./auth/better-auth.ts"
import { bindings } from "./auth/bindings.ts"
import { accountRoutes } from "./routes/account.ts"
import { adminRoutes } from "./routes/admin.ts"
import { authRoutes } from "./routes/auth.ts"
import { avatarRoutes } from "./routes/avatars.ts"
import { postRoutes } from "./routes/posts.ts"
import { realtimeRoutes } from "./routes/realtime.ts"
import { roomRoutes } from "./routes/rooms.ts"

export const app = new Hono()
  .basePath("/api")
  .get("/", (c) => c.text("Hello Hono!"))
  .route("/", authRoutes)
  .route("/", accountRoutes)
  .route("/", adminRoutes)
  .route("/", postRoutes)
  .route("/", avatarRoutes)
  .route("/", roomRoutes)
  .route("/", realtimeRoutes)
  .on(["GET", "POST"], "/auth/*", (c) => auth(bindings()).handler(c.req.raw))
  .get("/ready", async (c) => {
    const rows = await db.execute<{ database: string }>(
      sql`select current_database() as database`
    )
    return c.json({ ok: true as const, database: rows[0].database })
  })

export type App = typeof app
```

`basePath("/api")` means a route declared as `/ready` is `/api/ready`, and the Better Auth wildcard is declared as `/auth/*`. Better Auth’s `basePath` is the full public path `/api/auth`, because it reads the incoming URL, not the path Hono has left after the base.

Drop `.compile()`. Chain `.route()` so `typeof app` still sees every route. A loose `app.route("/", routes)` after the type is captured makes the RPC client lose those paths.

The `.on("/auth/*", ...)` line is phase 3. Phase 1 mounts the route modules only. Adding the wildcard before `auth()` exists makes every unmatched `/api/auth/*` request throw.

Each file in `src/server/routes/` exports `new Hono()` instead of `new Elysia()`. Paths stay the same, without the `/api` prefix.

```ts
export const postRoutes = new Hono().get("/posts", async (c) =>
  c.json((await listPublicPosts()).map(resources.posts.postPublicResource))
)
```

Mount order for auth specifically:

1. `authRoutes` registers `POST /auth/register`, `POST /auth/login`, and `POST /auth/logout`.
2. The wildcard `/auth/*` is registered on `app` after `.route("/", authRoutes)`.

## Validation and errors

Replace Elysia `t` with Zod and `@hono/zod-validator`. The API contract is HTTP 422 `{ ok: false, message }`. The validator’s default status is 400, so pass a hook.

```ts
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"

function invalid(result: { success: false; error: z.ZodError }) {
  const issue = result.error.issues[0]
  return { ok: false as const, message: issue?.message ?? "Invalid input." }
}

export const jsonBody = <T extends z.ZodType>(schema: T) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(invalid(result), 422)
    }
  })
```

Put `jsonBody` in `src/server/http.ts`. Multipart uses `zValidator("form", schema)` with the same hook. `t.File()` on `POST /me/avatar` becomes `z.instanceof(File)` under the form key `avatar`.

| Elysia                                       | Zod                                          |
| -------------------------------------------- | -------------------------------------------- |
| `t.String()`                                 | `z.string()`                                 |
| `t.Optional(t.String())`                     | `z.string().optional()`                      |
| `t.Union([t.String(), t.Null()])`            | `z.string().nullable().optional()`           |
| `t.Literal("DRAFT")`                         | `z.literal("DRAFT")`                         |
| `t.Number()`                                 | `z.number()`                                 |
| `t.Array(t.Record(t.String(), t.Unknown()))` | `z.array(z.record(z.string(), z.unknown()))` |
| `t.File()`                                   | `z.instanceof(File)` on a form validator     |

`run` takes a Hono context. Routes that set `set.status` and return a body throw `ServiceError` instead, including the admin “User not found.” 404.

```ts
import type { Context } from "hono"
import { ServiceError } from "./services/errors.ts"

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
```

Avatar bytes stay a `Response`. Do not pass them through `c.json`.

```ts
return new Response(file.bytes, {
  headers: {
    "content-type": file.contentType,
    "cache-control": "public, max-age=31536000, immutable",
  },
})
```

## Authorization middleware

Blocking checks move into middleware imported from `src/server/auth/guard.ts`. A route file applies one middleware, and the handler reads the user with `c.get("user")`. The 401 and 403 bodies stay the ones `ServiceError` already carries.

`createMiddleware` from `hono/factory` is what makes `c.get("user")` typed. There is no Better Auth or Hono package that knows this app’s hold rules, so these three functions are the middleware.

```ts
import { createMiddleware } from "hono/factory"
import type { users } from "../db/schema.ts"

type UserRow = typeof users.$inferSelect

export type AuthEnv = {
  Variables: {
    user: UserRow
  }
}

async function signedInUser(request: Request) {
  const user = await readActor(request)
  if (!user) {
    throw new ServiceError(401, { ok: false, message: "Not signed in." })
  }
  return user
}

export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  c.set("user", await signedInUser(c.req.raw))
  await next()
})

export const requireActiveUser = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await signedInUser(c.req.raw)
  const hold = await getAccountHold(user)
  if (hold) {
    throw new ServiceError(403, hold)
  }
  c.set("user", user)
  await next()
})

export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await signedInUser(c.req.raw)
  const hold = await getAccountHold(user)
  if (hold) {
    throw new ServiceError(403, hold)
  }
  if (user.role !== "ADMIN") {
    throw new ServiceError(403, {
      ok: false,
      message: "Admin access is required.",
    })
  }
  c.set("user", user)
  await next()
})
```

A throw inside middleware happens before `run`, so `app.onError` is the translator for both middleware and handlers:

```ts
app.onError((error, c) => {
  if (error instanceof ServiceError) {
    return c.json(error.body, error.status as 401 | 403 | 404 | 422 | 503)
  }
  console.error(error)
  return c.json({ ok: false as const, message: "Internal server error." }, 500)
})
```

Apply the middleware with a path. A pathless `.use(requireAdmin)` on a router mounted at `/` runs for every `/api` route, including public ones. Hono also accepts a middleware as an argument before one handler.

| Router                                                                  | Middleware                                                       | Why                                                                                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `account.ts`                                                            | `.use("/me")` and `.use("/me/*")` with `requireActiveUser`       | Profile, password, and avatar all require an active session.                                                    |
| `admin.ts`                                                              | `.use("/admin/*", requireAdmin)`                                 | Every path is under `/admin`.                                                                                   |
| `rooms.ts`                                                              | `.use("/rooms")` and `.use("/rooms/*")` with `requireActiveUser` | Chat is signed-in only.                                                                                         |
| `realtime.ts`                                                           | `.use("/realtime/*", requireActiveUser)`                         | Chat is signed-in only.                                                                                         |
| `posts.ts` writes, `GET /me/posts`                                      | `requireActiveUser` on those routes                              | `GET /posts` is public.                                                                                         |
| `GET /posts/:postId`                                                    | none                                                             | `readActor` stays a function. A missing session is a public view, and a middleware here would turn it into 401. |
| `GET /me`                                                               | `requireUser`                                                    | A banned user must still receive their user plus `hold`. `requireActiveUser` would 403 that response.           |
| `POST /auth/register`, `POST /auth/login`, `GET /avatars/:userId/:file` | none                                                             | Public.                                                                                                         |
| `GET /api`, `GET /api/ready`                                            | none                                                             | Public.                                                                                                         |

```ts
export const adminRoutes = new Hono<AuthEnv>()
  .use("/admin/*", requireAdmin)
  .get("/admin/users", (c) =>
    run(c, async () => {
      const actor = c.get("user")
      return (await listUsers()).map(resources.users.userResource)
    })
  )

export const postRoutes = new Hono<AuthEnv>()
  .get("/posts", async (c) =>
    c.json((await listPublicPosts()).map(resources.posts.postPublicResource))
  )
  .post("/posts", requireActiveUser, jsonBody(postBody), (c) =>
    run(c, async () =>
      resources.posts.postDetailResource(
        await createPost(c.get("user"), c.req.valid("json"))
      )
    )
  )
```

`user-service.ts` has its own `requireUser(id)` for loading a row by id. Leave that function in the service. The middleware in `guard.ts` is the HTTP gate. `readActor` still takes `c.req.raw` on `GET /posts/:postId`.

## TanStack adapter and the RPC client

`src/routes/api.$.ts` keeps the catch-all handlers. `app.fetch(request)` stays the forward. Delete the Eden import.

Server loaders call the app in-process, with the incoming `Cookie` header, the way `treaty(app, { headers })` does today. The browser calls `window.location.origin` with credentials. `getTreaty()` keeps its name and its `{ api }` wrapper so call sites change in one way. The Eden client was a thenable; `hc` is not, but keep the wrapper so a later `return getTreaty()` cannot be mistaken for a response.

```ts
import { hc } from "hono/client"
import { createIsomorphicFn, createServerOnlyFn } from "@tanstack/react-start"
import { createFileRoute } from "@tanstack/react-router"
import type { App } from "@/server/app"

const handleWithApp = createServerOnlyFn(async (request: Request) => {
  const { app } = await import("@/server/app")
  return app.fetch(request)
})

const handle = ({ request }: { request: Request }) => handleWithApp(request)

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
      HEAD: handle,
    },
  },
})

export const getTreaty = createIsomorphicFn()
  .server(async () => {
    const [{ app }, { getRequest }] = await Promise.all([
      import("@/server/app"),
      import("@tanstack/react-start/server"),
    ])
    const cookie = getRequest().headers.get("cookie")
    const client = hc<App>("http://tanstack.local", {
      fetch: (input, init) => app.request(input, init),
      headers: cookie ? { cookie } : undefined,
    })
    return { api: client.api }
  })
  .client(() => ({
    api: hc<App>(window.location.origin, {
      init: { credentials: "include" },
    }).api,
  }))
```

`http://tanstack.local` is only the base the client joins paths onto. `app.request` never dials it.

Eden returned `{ data, error }` and put the JSON body on `error.value`. `hc` returns a `Response`. Update `errorMessage` in `src/lib/records.ts` so it reads `message` from a parsed body. Teach every caller the same shape:

```ts
const response = await api.posts.$get()
const body: unknown = await response.json()
if (!response.ok) {
  throw new Error(errorMessage(body, "Could not load posts."))
}
```

Apply that at each current `getTreaty()` site:

| Eden                                                  | Hono RPC                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `api.me.get()`                                        | `api.me.$get()`                                                                    |
| `api.me.patch(body)`                                  | `api.me.$patch({ json: body })`                                                    |
| `api.me.password.put({ nextPassword })`               | `api.me.password.$put({ json: { nextPassword } })`                                 |
| `api.me.avatar.post({ avatar: file })`                | `api.me.avatar.$post({ form: { avatar: file } })`                                  |
| `api.me.posts.get()`                                  | `api.me.posts.$get()`                                                              |
| `api.posts.get()`                                     | `api.posts.$get()`                                                                 |
| `api.posts.post(payload)`                             | `api.posts.$post({ json: payload })`                                               |
| `api.posts({ postId }).get()`                         | `api.posts[":postId"].$get({ param: { postId } })`                                 |
| `api.posts({ postId }).patch(payload)`                | `api.posts[":postId"].$patch({ param: { postId }, json: payload })`                |
| `api.posts({ postId }).delete()`                      | `api.posts[":postId"].$delete({ param: { postId } })`                              |
| `api.posts({ postId }).comments.post({ body })`       | `api.posts[":postId"].comments.$post({ param: { postId }, json: { body } })`       |
| `api.posts({ postId }).rating.put({ score, review })` | `api.posts[":postId"].rating.$put({ param: { postId }, json: { score, review } })` |
| `api.admin.users.get()`                               | `api.admin.users.$get()`                                                           |
| `api.admin.users({ userId }).get()`                   | `api.admin.users[":userId"].$get({ param: { userId } })`                           |
| `api.admin.posts.get()`                               | `api.admin.posts.$get()`                                                           |
| `api.rooms.get()` / `api.rooms.post({ name })`        | `api.rooms.$get()` / `api.rooms.$post({ json: { name } })`                         |
| `api.rooms({ roomId }).get()`                         | `api.rooms[":roomId"].$get({ param: { roomId } })`                                 |
| `api.rooms({ roomId }).join.post()`                   | `api.rooms[":roomId"].join.$post({ param: { roomId } })`                           |
| `api.realtime.config.get()`                           | `api.realtime.config.$get()`                                                       |
| `api.auth.login.post(...)`                            | `api.auth.login.$post({ json })`                                                   |
| `api.auth.register.post(...)`                         | `api.auth.register.$post({ json })`                                                |
| `api.auth.logout.post()`                              | `api.auth.logout.$post()`                                                          |

`src/routes/dashboard/chat/$roomId.tsx` checks `error.value` for a missing room. Check `response.status === 404` instead. `src/components/chat-room.tsx` already posts to `/api/realtime/auth` with `fetch` and `credentials: "include"`. Leave that request alone.

Login and register read `result.error.value` for `message`, `bannedAt`, and `lockedUntil`. Read those fields from the parsed JSON when `response.status === 403`.

## Better Auth

Files, matching the example’s split:

| File                             | Role                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/server/auth/options.ts`     | `betterAuthOptions`. App name `Folio`. `basePath: "/api/auth"`. `trustedOrigins` from `BETTER_AUTH_URL`. |
| `src/server/auth/bindings.ts`    | `{ DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET }` from `process.env` on Node.                      |
| `src/server/auth/better-auth.ts` | `auth(env)` factory.                                                                                     |
| `better-auth.config.ts`          | CLI-only instance at the repo root.                                                                      |

`auth(env)` follows the example: spread `betterAuthOptions`, pass `baseURL`, `secret`, and `drizzleAdapter`. Pass `schema` in the adapter on both the runtime and the CLI. Map the keys `users`, `sessions`, `accounts`, and `verifications` onto the Drizzle tables. Those keys are the `modelName` values. This Better Auth release looks the table up by that name, so a map keyed `user` / `session` reports the tables as missing.

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { db } from "../db/index.ts"
import * as schema from "../db/schema.ts"
import { getAccountHold, getById } from "../services/user-service.ts"
import { betterAuthOptions } from "./options.ts"

export function auth(env: {
  DATABASE_URL: string
  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
}) {
  return betterAuth({
    ...betterAuthOptions,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
      },
    }),
    advanced: {
      database: { generateId: "uuid" },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await getById(session.userId)
            if (!user) {
              throw new APIError("UNAUTHORIZED", {
                message: "Not signed in.",
              })
            }
            const hold = await getAccountHold(user)
            if (hold) {
              throw new APIError("FORBIDDEN", hold)
            }
          },
        },
      },
    },
  })
}
```

Cache the Node instance. Building a client per request is the example’s Worker shape, where `neon()` is stateless HTTP. A `postgres` pool must be the singleton in `src/server/db/index.ts`. The factory still takes `env` so a Worker can later pass `c.env` and construct a Neon client in that branch only.

```ts
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

const sql = neon(env.DATABASE_URL)
const workerDb = drizzle(sql, { schema })
```

Pass `workerDb` into `drizzleAdapter` with the same `{ user, session, account, verification }` map. `schema` here is only the Drizzle client schema.

Add `@neondatabase/serverless` in the Worker phase, not during `vp dev`.

### Schema

Existing `users.id` and every foreign key are uuids. `advanced.database.generateId: "uuid"` keeps that. Better Auth’s default id is a text token; leaving the default would break `posts.author_id` and the other user foreign keys.

Keep the physical table names `users` and `sessions` through Better Auth’s model names so those foreign keys do not move:

```ts
user: {
  modelName: "users",
  additionalFields: {
    fname: { type: "string", required: true },
    lname: { type: "string", required: true },
    phone: { type: "string", required: false },
    role: { type: "string", required: false, defaultValue: "USER", input: false },
    status: { type: "string", required: false, defaultValue: "ACTIVE", input: false },
    bannedAt: { type: "date", required: false, input: false },
    lockedUntil: { type: "date", required: false, input: false },
    avatarUrl: { type: "string", required: false, input: false },
    phoneVerifiedAt: { type: "date", required: false, input: false },
  },
},
session: { modelName: "sessions" },
account: { modelName: "accounts" },
verification: { modelName: "verifications" },
```

`input: false` on role, status, and the hold columns stops a sign-up body from setting them. Services still write those columns.

Generate into a side file, then fold the new tables into `src/server/db/schema.ts` by hand. The example’s `--output ./src/db/schema.ts` is the command to avoid.

```bash
bunx @better-auth/cli@latest generate --config ./better-auth.config.ts --output ./src/server/db/better-auth.generated.ts
```

Then:

```bash
bun run db:generate -- --name better_auth
bun run db:migrate
```

Column changes on `users` and `sessions`:

- Add Better Auth’s `name`, `emailVerified`, `image`, and the `accounts` and `verifications` tables.
- Keep `fname`, `lname`, `phone`, `role`, `status`, `banned_at`, `locked_until`, `avatar_url`, `phone_verified_at`.
- `email` becomes `not null`. See the phone-only bridge below.
- Drop `password_hash`. The credential lives on `accounts.password` for `providerId = "credential"`.
- Replace `sessions.token_hash` with Better Auth’s session columns (`token`, `ip_address`, `user_agent`, `updated_at`). Existing session rows cannot be reused. Signing in again is the migration.

`better-auth.config.ts` reads `process.env` the way the example does, points Drizzle at `src/server/db/schema.ts`, and passes `schema` into the adapter. It exists for the CLI. The running app uses `src/server/auth/better-auth.ts`.

### Register, login, logout

Better Auth’s email sign-up requires an email. This app allows a phone without an email. When `email` is null, store a non-routable address and keep returning `email: null` from `userResource`:

```ts
function accountEmail(email: string | null, phone: string) {
  if (email) return email
  const digits = phone.slice(1)
  return `${digits}@users.folio.invalid`
}
```

`userResource` maps an address that ends in `@users.folio.invalid` back to `null`.

`POST /api/auth/register` still accepts `{ fname, lname, email?, phone?, password }` and still enforces “at least one of email or phone”, the international email check, and E.164. On success it calls:

```ts
const response = await auth(bindings()).api.signUpEmail({
  body: {
    name: `${fname} ${lname}`,
    email: accountEmail(email, phone),
    password,
    fname,
    lname,
    phone: phone ?? undefined,
  },
  asResponse: true,
})
```

Return that `Response` unchanged so its `Set-Cookie` reaches the browser. Then load the user and return the existing JSON `{ ok: true, user }` if you build the response yourself: copy `set-cookie` off the Better Auth response onto `c.json(...)`. One of those two must happen. A JSON body with no cookie leaves the new user signed out.

`POST /api/auth/login` still accepts `{ identifier, password }`. Resolve `identifier` to the stored email (the real one, or the `@users.folio.invalid` bridge). If `getAccountHold` returns a hold, respond 403 with that body and do not call sign-in. Otherwise:

```ts
return auth(bindings()).api.signInEmail({
  body: { email, password },
  asResponse: true,
})
```

The session hook is the second gate, for any client that hits `/api/auth/sign-in/email` directly.

`POST /api/auth/logout` calls `auth.api.signOut({ headers: c.req.raw.headers, asResponse: true })` and returns that response. The cookie name is Better Auth’s session cookie, not `session`.

`GET /api/me` uses the `requireUser` middleware, then loads `hold` for `c.get("user")`. No session is 401 `{ ok: false, message: "Not signed in." }`. A session returns the public user plus `hold`, as today.

In phase 3, `readActor` inside the middleware calls `auth.api.getSession` and `getById`. The route files keep the same `.use(...)` lines. Delete `readCookie`, `readSession`, `createSession`, `destroySession`, `sessionCookie`, and `clearSessionCookie` once nothing imports them. Delete `src/server/auth/password.ts` once nothing imports it.

Owner and admin password changes write `accounts.password` with `hashPassword` from `better-auth/crypto`. Keep the request bodies: `{ nextPassword }` only. Do not ask for the current password. Existing scrypt strings in `password_hash` do not verify under Better Auth. Local users register again.

Banned, suspended, and locked accounts still get no session. `users.status` stays the only login gate. Role `LOCKED` still does not block login by itself.

## Workers, when you deploy there

Out of scope for the `vp dev` pass. When this app runs as a Worker, switch the factory’s database branch to the example’s Neon client, pass `c.env` into `auth(c.env)`, and generate bindings:

```bash
bunx wrangler types --env-interface CloudflareBindings
```

Include `worker-configuration.d.ts` from `tsconfig.json` as the example shows. `@cloudflare/vite-plugin` is already a dev dependency and is not turned on in `vite.config.ts`. Turning it on is a separate change. `documentation/01-load-testing.md` still describes an in-process Elysia call; update that sentence to Hono when this pass lands.

## Phases

### Phase 1 — Hono, same auth

Files: `src/server/app.ts`, `src/server/http.ts`, `src/server/auth/guard.ts`, `src/server/routes/*`, `src/routes/api.$.ts`, `src/lib/records.ts`, and the `getTreaty()` call sites.

Done when every current route responds through Hono, Eden is gone, validation failures are 422, account, admin, room, and realtime routers apply their middleware once, and register, login, logout, and `GET /api/me` still use the scrypt session code.

### Phase 2 — Better Auth schema

Files: `src/server/auth/options.ts`, `src/server/auth/bindings.ts`, `src/server/auth/better-auth.ts`, `better-auth.config.ts`, `src/server/db/schema.ts`, a new Drizzle migration.

Done when `bun run db:migrate` applies the Better Auth tables, `users` keeps its folio columns, and `password_hash` is gone.

### Phase 3 — Session swap

Files: `src/server/routes/auth.ts`, `src/server/auth/guard.ts`, `src/server/services/user-service.ts`. Remove `src/server/auth/session.ts` and `src/server/auth/password.ts`.

Done when register and login set a Better Auth cookie, a held account receives the 403 issue body and no cookie, logout clears the cookie, and `GET /api/me` reads `getSession`.

### Phase 4 — Call sites and passwords

Files: login, register, the four logout buttons (`app-shell`, `site-chrome`, `admin-sidebar`, `admin-user-menu`), profile password, admin password.

Done when those screens use the RPC client, a phone-only account round-trips with `email: null` in JSON, and an admin-set password signs that user in.

## Acceptance

- `vp check` and `vp run typecheck` pass.
- `elysia` and `@elysiajs/eden` are not dependencies.
- `GET /api` returns `Hello Hono!`. `GET /api/ready` still reports `elysia_tanstart`.
- A non-active login is 403 and includes the issue reason. No session cookie is set.
- Public post list, ratings, avatars, and chat behave as in the overview and the live-chat doc.
- Loaders still call the app in-process. A document request does not proxy to itself over HTTP.
- The Better Auth wildcard is `/api/auth/*`. `GET /api/posts` is served by `postRoutes`.
- `GET /api/admin/users` without a session is 401 from `requireAdmin`. `GET /api/posts` does not run that middleware.
