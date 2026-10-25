# Execution spec

This file is the source of truth for the next implementation pass. Implement the phases in order. Keep behavior inside the decisions in this file.

## Current codebase

Already done. Extend it. Do not recreate it.

- TanStack Start app. Dev server: `vp dev --port 3000` at `http://localhost:3000`.
- Elysia is mounted through TanStack Start server handlers in `src/routes/api.$.ts`. That file is the HTTP adapter only. It forwards every method to the Elysia app and exports `getTreaty()`.
- The Elysia app lives in `src/server/app.ts` with prefix `/api`.
- Eden Treaty: server calls the app in-process. Browser calls `window.location.origin`. Loaders use `const { api } = await getTreaty()`. `getTreaty()` returns `{ api }` because the Eden client is a thenable and must not be returned directly from an async function.
- Postgres database `elysia_tanstart`. Connection string in `.env`:

```
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/elysia_tanstart
```

- Drizzle schema: `src/server/db/schema.ts`. Client: `src/server/db/index.ts`. Config: `drizzle.config.ts`. Migrations: `drizzle/`.
- Existing endpoints, keep them working:
  - `GET /api` → `Hello Elysia!`
  - `GET /api/ready` → `{ ok: true, database: "elysia_tanstart" }`

## Rules for the next pass

- All server behavior goes under `src/server`. That includes Elysia plugins, services, auth helpers, and Drizzle access.
- `src/routes` holds TanStack pages and the `/api/$` adapter. Pages call Elysia through `getTreaty()`. They do not import `db`.
- Add Elysia plugins in `src/server/routes/*.ts` and mount them with `.use()` in `src/server/app.ts`.
- Schema changes happen only in `src/server/db/schema.ts`, then:

```
bun run db:generate -- --name <slug>
bun run db:migrate
```

- `bun run db:push` is allowed for local sync. `bun run db:studio` opens Drizzle Studio.
- Validate with `vp check` and `vp run typecheck`.
- Auth is a `UserService` plus the `sessions` table. Do not add Better Auth.
- Passwords are stored only in `users.password_hash`. Hash with `node:crypto` `scrypt`. Never return the hash from an API.
- Store missing email or phone as `null`, never `""`.
- Every update sets `updated_at` in the service. There is no database trigger.

## Resolved product decisions

- The status enum value is `BANNED` (the notes spelled it `BANNES`).
- `users.status` is the only login gate. `ACTIVE` can sign in. `BANNED`, `SUSPENDED`, and `LOCKED` cannot.
- `users.role` stays `USER | ADMIN | LOCKED`, default `USER`. Role `LOCKED` does not block login by itself. Admins assign it from Manage Roles.
- A person must register with at least one of email or phone.
- Email accepts internationalized addresses. Require one `@` and a domain label after it. Do not restrict the local part to ASCII.
- Phone is E.164: `^\+[1-9]\d{1,14}$`.
- Posts have a `title` and a BlockNote JSON document in `posts.body`. HTML is not the stored source.
- A public post has `status = PUBLISHED` and `published_at` is null or `<= now()`. A `PUBLISHED` post with a future `published_at` is scheduled. `DRAFT` and scheduled posts are visible to the author and to admins only.
- Increment `views_counter` by 1 when a public viewer opens the post. No deduplication.
- One rating per user per post. Score is an integer from 1 to 5. A rating may include a written review. `posts.average_ratings` stores the mean score and is recalculated whenever a rating is saved.
- Comments are plain text.
- Avatar files go in `storage/avatars/` (gitignored). Max 2_000_000 bytes. Allow `image/png`, `image/jpeg`, and `image/webp`.
- Lock durations are exact for hours, days, and weeks. Month and year options use fixed day counts: 1 month = 30 days, 3 months = 90 days, 6 months = 180 days, 9 months = 270 days, 1 year = 365 days.
- Session cookie name is `session`. `HttpOnly`, `SameSite=Lax`, `Path=/`. Lifetime is 30 days. Store only a hash of the token.

## Database

Tables already exist in `src/server/db/schema.ts` and are migrated. Use these columns.

### users

| column            | type             | notes                                                       |
| ----------------- | ---------------- | ----------------------------------------------------------- |
| id                | uuid pk          | `gen_random_uuid()`                                         |
| fname             | text             | required                                                    |
| lname             | text             | required                                                    |
| email             | text null        | unique, multiple nulls allowed                              |
| phone             | text null        | unique, E.164, multiple nulls allowed                       |
| password_hash     | text             | required                                                    |
| email_verified_at | timestamptz null |                                                             |
| phone_verified_at | timestamptz null |                                                             |
| role              | user_role        | `USER`, `ADMIN`, `LOCKED`. Default `USER`                   |
| status            | user_status      | `ACTIVE`, `BANNED`, `SUSPENDED`, `LOCKED`. Default `ACTIVE` |
| banned_at         | timestamptz null | set when status becomes `BANNED`                            |
| locked_until      | timestamptz null | set when status becomes `LOCKED`                            |
| avatar_url        | text null        | app path returned by the avatar route                       |
| created_at        | timestamptz      |                                                             |
| updated_at        | timestamptz      |                                                             |

### sessions

| column     | type        | notes                    |
| ---------- | ----------- | ------------------------ |
| id         | uuid pk     |                          |
| user_id    | uuid        | fk users, cascade delete |
| token_hash | text        | unique                   |
| expires_at | timestamptz |                          |
| created_at | timestamptz |                          |

### account_issues

Written whenever an admin bans, suspends, or locks a user. Login reads the latest unresolved row for the current status.

| column      | type               | notes                                              |
| ----------- | ------------------ | -------------------------------------------------- |
| id          | uuid pk            |                                                    |
| user_id     | uuid               | subject, cascade delete                            |
| kind        | account_issue_kind | `BAN`, `SUSPEND`, `LOCK`                           |
| reason      | text               | shown to the user when login is refused            |
| starts_at   | timestamptz        |                                                    |
| ends_at     | timestamptz null   | lock end, equal to `users.locked_until` for `LOCK` |
| created_by  | uuid null          | acting admin, set null if that admin is deleted    |
| resolved_at | timestamptz null   | set when the account returns to `ACTIVE`           |
| created_at  | timestamptz        |                                                    |

### posts

| column          | type             | notes                                 |
| --------------- | ---------------- | ------------------------------------- |
| id              | uuid pk          |                                       |
| author_id       | uuid             | fk users, cascade delete              |
| title           | text             | required                              |
| body            | jsonb            | BlockNote document, array of blocks   |
| views_counter   | integer          | default 0                             |
| average_ratings | float8 null      | mean of rating scores; null when none |
| status          | post_status      | `DRAFT`, `PUBLISHED`. Default `DRAFT` |
| published_at    | timestamptz null | future value schedules the post       |
| created_at      | timestamptz      |                                       |
| updated_at      | timestamptz      |                                       |

### comments

| column     | type        | notes          |
| ---------- | ----------- | -------------- |
| id         | uuid pk     |                |
| post_id    | uuid        | cascade delete |
| author_id  | uuid        | cascade delete |
| body       | text        | required       |
| created_at | timestamptz |                |
| updated_at | timestamptz |                |

### ratings

| column     | type        | notes                   |
| ---------- | ----------- | ----------------------- |
| id         | uuid pk     |                         |
| post_id    | uuid        | cascade delete          |
| user_id    | uuid        | cascade delete          |
| score      | integer     | check `1 <= score <= 5` |
| review     | text null   | optional written review |
| created_at | timestamptz |                         |

Unique on `(post_id, user_id)`. A second rating from the same user updates the existing row.

## Services to add

Place them in `src/server/services/`. Throw typed errors. Routes translate those errors into HTTP responses. Do not query Drizzle from route components.

### `src/server/auth/password.ts`

- `hashPassword(plain: string): Promise<string>`
- `verifyPassword(plain: string, passwordHash: string): Promise<boolean>`

### `src/server/auth/session.ts`

- `createSession(userId: string): Promise<{ token: string, expiresAt: Date }>`
- `readSession(token: string | undefined): Promise<User | null>`
- `destroySession(token: string | undefined): Promise<void>`
- Cookie header helpers for set and clear.

### `src/server/auth/lock-durations.ts`

Export this list, in this order, for the admin dropdown:

| id  | label    | duration |
| --- | -------- | -------- |
| 1h  | 1 hour   | 1 hour   |
| 2h  | 2 hours  | 2 hours  |
| 1d  | 1 day    | 1 day    |
| 3d  | 3 days   | 3 days   |
| 1w  | 1 week   | 7 days   |
| 1mo | 1 month  | 30 days  |
| 3mo | 3 months | 90 days  |
| 6mo | 6 months | 180 days |
| 9mo | 9 months | 270 days |
| 1y  | 1 year   | 365 days |

### `src/server/services/user-service.ts`

- `register({ fname, lname, email, phone, password })`
- `login({ identifier, password })` where identifier is email or phone
- `getById(id)`
- `updateProfile(userId, { fname, lname, email, phone })`
- `setPassword(userId, { nextPassword })` for the account owner
- `adminSetPassword(actorId, userId, { nextPassword })`
- `setRole(actorId, userId, role)`
- `setStatus(actorId, userId, { status, reason, lockDurationId })`
- `listUsers()` for the admin table
- `listAccountIssues(userId)`

`login` when `status !== ACTIVE`:

- Respond `403` with `{ ok: false, code, message, bannedAt, lockedUntil }`.
- `code` is the status.
- `message` is the latest unresolved `account_issues.reason` whose kind matches the status (`BAN`, `SUSPEND`, or `LOCK`).
- If no issue row exists, `message` is `This account is banned.`, `This account is suspended.`, or `This account is locked.`
- Do not create a session.

`setStatus`:

- Actor must be `ADMIN` and `ACTIVE`.
- `BANNED` sets `banned_at = now()`, clears `locked_until`, inserts a `BAN` issue, and requires `reason`.
- `SUSPENDED` clears `banned_at` and `locked_until`, inserts a `SUSPEND` issue, and requires `reason`.
- `LOCKED` sets `locked_until` from `lockDurationId`, clears `banned_at`, inserts a `LOCK` issue with `ends_at = locked_until`, and requires `reason`.
- `ACTIVE` clears `banned_at` and `locked_until` and sets `resolved_at = now()` on unresolved issues.
- Changing status resolves the previous unresolved issues before inserting the new one.

### `src/server/services/post-service.ts`

- `createPost(authorId, input)`
- `updatePost(actorId, postId, input)` author or admin
- `deletePost(actorId, postId)` author or admin
- `listOwnPosts(authorId)`
- `listAllPosts()` admin, every status
- `listPublicPosts()`
- `getPost(actor, postId)` enforces the visibility rule above and increments `views_counter` only for a public view
- `addComment(userId, postId, body)` on a post the user is allowed to read
- `ratePost(userId, postId, score)` upsert on `(post_id, user_id)`

### `src/server/services/avatar-service.ts`

- `saveAvatar(userId, file)` writes `storage/avatars/{userId}/{uuid}.{ext}` and sets `avatar_url` to `/api/avatars/{userId}/{file}`
- `readAvatar(userId, file)` returns bytes and content type, or null. Reject `..`, slashes, and any path outside that user directory.

## HTTP API

Mount these on the existing Elysia app. Shapes below are the JSON bodies. Authenticated routes read the `session` cookie.

| method | path                              | auth              | behavior                              |
| ------ | --------------------------------- | ----------------- | ------------------------------------- |
| POST   | /api/auth/register                | public            | create user, set session cookie       |
| POST   | /api/auth/login                   | public            | login rule above                      |
| POST   | /api/auth/logout                  | session           | destroy session and clear cookie      |
| GET    | /api/me                           | session           | current public user                   |
| PATCH  | /api/me                           | session           | profile fields                        |
| PUT    | /api/me/password                  | session           | owner password change                 |
| POST   | /api/me/avatar                    | session           | multipart field `avatar`              |
| GET    | /api/avatars/:userId/:file        | public            | avatar bytes                          |
| GET    | /api/admin/users                  | admin             | user list                             |
| GET    | /api/admin/users/:userId          | admin             | user, posts, issues                   |
| PUT    | /api/admin/users/:userId/role     | admin             | `{ role }`                            |
| PUT    | /api/admin/users/:userId/password | admin             | `{ nextPassword }`                    |
| PUT    | /api/admin/users/:userId/status   | admin             | `{ status, reason, lockDurationId? }` |
| GET    | /api/admin/posts                  | admin             | all posts                             |
| GET    | /api/posts                        | public            | public posts                          |
| GET    | /api/posts/:postId                | public or session | visibility rule                       |
| POST   | /api/posts                        | session           | create                                |
| PATCH  | /api/posts/:postId                | author or admin   | update                                |
| DELETE | /api/posts/:postId                | author or admin   | delete                                |
| GET    | /api/me/posts                     | session           | own posts                             |
| POST   | /api/posts/:postId/comments       | session           | `{ body }`                            |
| PUT    | /api/posts/:postId/rating         | session           | `{ score, review? }`                  |

Public user JSON omits `passwordHash`. Include `id`, names, email, phone, verification timestamps, role, status, bannedAt, lockedUntil, avatarUrl, createdAt.

Validation errors are HTTP 422 `{ ok: false, message }`. Forbidden is 403. Missing records are 404.

## Pages

Use the existing shadcn card and button components. Posts use [BlockNote](https://www.blocknotejs.org/) for editing and reading `posts.body`.

| route                         | who         | contents                                                                                                     |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| /login                        | public      | identifier + password. On 403, show `message`, and `bannedAt` or `lockedUntil` when present                  |
| /register                     | public      | fname, lname, email, phone, password                                                                         |
| /dashboard                    | active user | links to own posts and profile                                                                               |
| /dashboard/posts              | active user | own posts, link to create                                                                                    |
| /dashboard/posts/new          | active user | BlockNote editor, title, status, published_at                                                                |
| /dashboard/posts/$postId      | author      | same editor for an existing post                                                                             |
| /dashboard/profile            | active user | fname, lname, email, phone, avatar upload, password change                                                   |
| /posts                        | public      | published posts that are due                                                                                 |
| /posts/$postId                | public      | post, comments, rating. Hidden drafts and scheduled posts 404 for other users                                |
| /admin/users                  | admin       | user table                                                                                                   |
| /admin/users/$userId          | admin       | layout with a mini-sidebar                                                                                   |
| /admin/users/$userId/roles    | admin       | role select, including `LOCKED`                                                                              |
| /admin/users/$userId/password | admin       | set a new password                                                                                           |
| /admin/users/$userId/posts    | admin       | posts by that user                                                                                           |
| /admin/users/$userId/issues   | admin       | account issues, plus ban, suspend, lock, and restore actions. Lock control is a dropdown of the duration ids |
| /admin/posts                  | admin       | all posts and their status                                                                                   |

The mini-sidebar labels are exactly: Manage Roles, Manage passwords, Posts posted, Account Issues.

Gate admin pages on `role === ADMIN` and `status === ACTIVE`. Gate user dashboard pages on `status === ACTIVE`. Send a non-active signed-in user to a page that shows the same violation payload as login.

## Phases

### Phase 1 — Auth

Files: `src/server/auth/*`, `src/server/services/user-service.ts`, `src/server/routes/auth.ts`, pages `/login` and `/register`.

Done when a new user can register and log in, a banned, suspended, or locked user receives the issue message instead of a session, and logout clears the cookie.

### Phase 2 — Admin user management

Files: admin user routes and `/admin/users/**`.

Done when an admin can change role, set a password, ban, suspend, lock for each duration, and restore the account to `ACTIVE`. Each punishment writes an `account_issues` row. Restore sets `resolved_at`.

### Phase 3 — Posts, comments, ratings

Files: `post-service`, post routes, `/dashboard/posts/**`, `/posts/**`.

Done when an author can save a BlockNote draft, schedule it with `published_at`, publish it, and see it on `/posts` only after it is due. Comments and ratings follow the table rules. `views_counter` increases on a public view.

### Phase 4 — Profile avatar and admin posts

Files: `avatar-service`, `/dashboard/profile`, `/admin/posts`.

Done when avatar upload round-trips through `GET /api/avatars/...`, and the admin post list shows drafts and scheduled posts.

## Acceptance

- `vp check` and `vp run typecheck` pass.
- `GET /api/ready` still reports `elysia_tanstart`.
- A non-active login response is 403 and includes the issue reason.
- Public post list excludes drafts and future `published_at` values.
- Rating a post twice leaves one row.
- No server module is imported by a page except through `getTreaty()` or the `/api/$` adapter.
