# Live chat

This file is the source of truth for the chat pass. Implement the phases in order. Keep behavior inside the decisions in this file.

Chat is a signed-in feature under the dashboard. Every room is public: any `ACTIVE` user can list rooms, create a room, open a room, and read its history. The page is a sidebar of rooms and a transcript of the selected room. Messages are stored in Postgres. Live delivery and online presence go through [Pusher](https://pusher.com/docs/channels/).

## Realtime

One TanStack process serves the app. `vp dev --port 3000` is the only server to run. Pusher holds the connections. This process publishes events with the `pusher` server SDK after it has written Postgres.

Add dependencies `pusher` and `pusher-js`.

Environment, in `.env`:

```
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

`PUSHER_SECRET` and `PUSHER_APP_ID` stay on the server. The browser receives `key` and `cluster` from `GET /api/realtime/config`. Pages do not read `process.env`.

`src/server/realtime/pusher.ts` builds the client with `useTLS: true`. If any of the four variables is missing, chat realtime routes respond `503` `{ ok: false, message: "Realtime is not configured." }`. The rest of the API, including `GET /api/ready`, still starts.

Each room is one presence channel:

```ts
;`presence-room-${roomId}`
```

`roomId` is the room uuid. The auth route rejects every other channel name.

Server event name for a new message is `message`. The payload is the `RoomMessage` resource below. Pusher caps an event at 10KB. A 2000-character body fits. Do not enable client events. The browser never publishes a message straight to the channel. It posts to Elysia, Elysia inserts the row, then Elysia triggers the event.

## Product rules

- The dashboard gate already applies. `beforeLoad` on `/dashboard` allows only an `ACTIVE` session. A banned, suspended, or locked user never reaches chat.
- There is no visibility column. "Public" means every active user may use every room.
- Opening a room records membership. Membership stays after the user goes offline. There is no leave action in this pass.
- Who is connected right now is the Pusher presence member list for that channel. The same `user_id` in two tabs counts as one member. That list is not stored.
- Messages are plain text. The composer is a textarea. Enter sends. Shift+Enter inserts a newline.
- The sender appends the message from the `POST` response. Other open clients append it from the Pusher event. Both paths dedupe on `id`.
- History is the latest 100 messages, oldest first. Older history is out of scope.
- Deleting a user deletes their messages and participant rows (`on delete cascade`). Deleting a user sets `rooms.created_by` to null so the room remains.
- An admin has no extra chat powers in this pass.

## Limits

| field     | rule                                           |
| --------- | ---------------------------------------------- |
| room name | trim, 1–80 characters, unique on `lower(name)` |
| message   | trim, 1–2000 characters                        |
| history   | 100 messages                                   |

Validation failures on HTTP are `422` `{ ok: false, message }`, matching the rest of the API. A missing room is `404`. An unauthenticated call is `401`. A signed-in user who is not `ACTIVE` is `403` with the existing account-hold body.

## Database

Add these tables in `src/server/db/schema.ts`, then:

```bash
bun run db:generate -- --name chat_rooms
bun run db:migrate
```

Follow the column style already in that file: uuid primary keys with `defaultRandom()`, `timestamptz`, and Drizzle relations next to the existing ones.

### rooms

| column     | type        | notes                              |
| ---------- | ----------- | ---------------------------------- |
| id         | uuid pk     |                                    |
| name       | text        | required                           |
| created_by | uuid null   | fk users, `on delete set null`     |
| created_at | timestamptz |                                    |
| updated_at | timestamptz | set in the service on every update |

Unique index `rooms_name_lower_unique` on `lower(name)`.

### room_participants

| column    | type        | notes                       |
| --------- | ----------- | --------------------------- |
| id        | uuid pk     |                             |
| room_id   | uuid        | fk rooms, cascade delete    |
| user_id   | uuid        | fk users, cascade delete    |
| joined_at | timestamptz | set once, on the first join |

Unique index `room_participants_room_user_unique` on `(room_id, user_id)`. A second join returns the existing row and does not change `joined_at`.

### room_messages

| column     | type        | notes                    |
| ---------- | ----------- | ------------------------ |
| id         | uuid pk     |                          |
| room_id    | uuid        | fk rooms, cascade delete |
| author_id  | uuid        | fk users, cascade delete |
| body       | text        | required, plain text     |
| created_at | timestamptz |                          |

Index `room_messages_room_created_idx` on `(room_id, created_at)`.

## Service

`src/server/services/chat-service.ts`. Throw `ServiceError`. Routes translate it. The service does not import Pusher. Pages do not import this module.

- `listRooms()` — every room, name order, with `participantCount`.
- `createRoom(userId, { name })` — insert, set `updated_at`, and join the creator.
- `getRoom(roomId)` — room or `404`.
- `joinRoom(userId, roomId)` — require an `ACTIVE` user and an existing room. Insert the participant row or return the current one.
- `listParticipants(roomId)` — participant id, user id, `fname`, `lname`, `joined_at`.
- `listMessages(roomId)` — latest 100, returned oldest first, with author names.
- `createMessage(userId, roomId, body)` — require `ACTIVE`, an existing room, and a participant row. Reject an empty or oversized body with `422`.

`joinRoom` and `createMessage` receive a user row that the caller already loaded. Re-read `users.status` inside `createMessage` so a ban takes effect on the next send without a new page load.

## HTTP

Plugin: `src/server/routes/rooms.ts`, mounted with `.use()` in `src/server/app.ts`. Guard with `requireActiveUser`. Map rows through `src/server/api-resources/rooms.ts` and register it on `resources` in `src/server/api-resources/index.ts`.

Name resources the way comments already do: ISO strings for timestamps, and `authorName` from `fname` and `lname`.

| method | path                          | behavior                                                                   |
| ------ | ----------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/rooms`                  | `{ rooms: Room[] }`                                                        |
| POST   | `/api/rooms`                  | body `{ name }`. Returns the room. Creator is a participant.               |
| GET    | `/api/rooms/:roomId`          | `{ room, participants, messages }`. Does not join.                         |
| POST   | `/api/rooms/:roomId/join`     | idempotent membership. Returns the participant.                            |
| POST   | `/api/rooms/:roomId/messages` | body `{ body, socketId? }`. Inserts, triggers Pusher, returns the message. |
| GET    | `/api/realtime/config`        | `{ key, cluster }`                                                         |
| POST   | `/api/realtime/auth`          | body `{ socketId, channelName }`. Authorizes one presence channel.         |

`POST /api/rooms/:roomId/messages` calls `createMessage`, then:

```ts
await pusher.trigger(`presence-room-${roomId}`, "message", message, {
  socket_id: socketId,
})
```

Pass `socket_id` only when the client sent a `socketId`. That omits the sender's connection, because the sender already has the `POST` body. If the trigger throws, still return the message with `200`. The row is the source of truth. Other clients catch up on the next load.

```ts
type Room = {
  id: string
  name: string
  createdBy: string | null
  participantCount: number
  createdAt: string
  updatedAt: string
}

type RoomParticipant = {
  id: string
  roomId: string
  userId: string
  name: string
  joinedAt: string
}

type RoomMessage = {
  id: string
  roomId: string
  body: string
  authorId: string
  authorName: string
  createdAt: string
}
```

### Channel auth

`pusher-js` calls `POST /api/realtime/auth` while subscribing. Implement that call with `channelAuthorization.customHandler` and `credentials: "include"`, JSON in and JSON out, so the session cookie is sent and the body matches the rest of the API.

The route:

1. Requires an `ACTIVE` user.
2. Accepts only a channel name of `presence-room-` plus a room uuid.
3. Loads that room or returns `404`.
4. Calls `joinRoom`.
5. Returns `pusher.authorizeChannel(socketId, channelName, presenceData)`.

Presence data:

```ts
{
  user_id: user.id,
  user_info: { name: `${user.fname} ${user.lname}` },
}
```

The response body is the Pusher auth payload (`auth` and `channel_data`). `pusher-js` requires that shape, so this route does not wrap it in a resource.

A subscription from a signed-out browser gets `401`. A channel outside `presence-room-{uuid}` gets `403`.

## Pages

Routes sit under the dashboard layout, so they inherit the session gate.

| route                     | contents                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/dashboard/chat`         | loader calls `GET /api/rooms` and `GET /api/realtime/config`. Sidebar, create form, empty prompt     |
| `/dashboard/chat/$roomId` | loader calls join, then `GET /api/rooms/:roomId`, and reads the same config. Sidebar plus transcript |

Add a `Chat` item to the dashboard nav in `src/routes/dashboard/route.tsx`, and add `/dashboard/chat` to the `to` union on `ShellLink` in `src/components/app-shell.tsx`. Add a card on `/dashboard` that links here, next to the posts and profile cards.

Layout inside the shell main:

- Desktop: a two-column grid. The room list is about 16rem. The transcript fills the rest.
- Narrow: the list stacks above the transcript.
- The selected room is the active router link.
- The transcript scrolls. New messages stick to the bottom when the reader is already near the bottom.
- Each message shows `authorName`, `body`, and the local time via `formatTime`.
- The participant list sits above the transcript. A name is marked online when that user id is in the presence members.
- The create form posts `{ name }`, then navigates to `/dashboard/chat/$roomId` for the returned id.
- An unknown room id renders the same `404` treatment the post page uses.
- When realtime config is `503`, show the transcript from the loader and say that live updates are unavailable. Sending still posts to the API.

The room view is a client component on `$roomId`, after the loader has joined. It owns the Pusher client, the composer, and the message list starting from loader data.

```ts
const client = new Pusher(key, {
  cluster,
  forceTLS: true,
  channelAuthorization: {
    customHandler({ socketId, channelName }, callback) {
      // POST /api/realtime/auth with the session cookie
    },
  },
})

const channel = client.subscribe(`presence-room-${roomId}`)
channel.bind("message", (message: RoomMessage) => {
  // append when message.id is new
})
```

Online ids come from `pusher:subscription_succeeded`, `pusher:member_added`, and `pusher:member_removed`. On unmount, unsubscribe and `disconnect()`. `pusher-js` reconnects on its own. A failed auth leaves the loader transcript on screen.

The composer posts `{ body, socketId }` through `getTreaty()`. `socketId` is `client.connection.socket_id`, or omitted before the connection is ready. Append the returned message the same way as a live event.

## Phases

### Phase 1 — Schema

Files: `src/server/db/schema.ts`, a migration named `chat_rooms`.

Done when `rooms`, `room_participants`, and `room_messages` exist in `elysia_tanstart` with the indexes above.

### Phase 2 — Service and HTTP

Files: `chat-service.ts`, `api-resources/rooms.ts`, `routes/rooms.ts`, `app.ts`.

Done when an active user can create a room, list rooms, join, post a message, and read the latest 100 messages through Eden. A second join leaves one participant row. A duplicate name is `422`.

### Phase 3 — Pusher

Files: `src/server/realtime/pusher.ts`, config and auth routes, the trigger inside `POST /api/rooms/:roomId/messages`.

Done when two browsers signed in as different active users, subscribed to the same room, each see a message the other sends without a refresh, and both see it after a reload. A request without a session cannot authorize the channel. `PUSHER_SECRET` is absent from every response.

### Phase 4 — Dashboard UI

Files: `src/routes/dashboard/chat/**`, the dashboard nav, the overview card, `ShellLink`.

Done when an active user can create a room from the sidebar, open it, and watch messages and presence change without refreshing. A non-active user still lands on `/account-status`.

## Run

```bash
vp dev --port 3000
```

Set the four `PUSHER_*` variables before exercising live delivery. Validate with `vp check` and `vp run typecheck`.

## Acceptance

- `GET /api/ready` still reports `elysia_tanstart`.
- Existing post, auth, and admin routes behave as they do today.
- Room names are unique ignoring case.
- `(room_id, user_id)` has at most one participant row.
- A message is one insert. The `POST` body and the `message` event carry the same resource, and the row is still there on reload.
- Channel auth joins the room and signs only `presence-room-{uuid}`.
- No page imports `db`, `chat-service`, or the `pusher` server package. Pages call HTTP through `getTreaty()` and subscribe with `pusher-js`.
