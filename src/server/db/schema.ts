import { relations, sql } from "drizzle-orm"
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const userRole = pgEnum("user_role", ["USER", "ADMIN", "LOCKED"])
export const userStatus = pgEnum("user_status", [
  "ACTIVE",
  "BANNED",
  "SUSPENDED",
  "LOCKED",
])
export const postStatus = pgEnum("post_status", ["DRAFT", "PUBLISHED"])
export const accountIssueKind = pgEnum("account_issue_kind", [
  "BAN",
  "SUSPEND",
  "LOCK",
])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fname: text("fname").notNull(),
    lname: text("lname").notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    role: userRole("role").notNull().default("USER"),
    status: userStatus("status").notNull().default("ACTIVE"),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_phone_unique").on(table.phone),
  ]
)

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash)]
)

export const accountIssues = pgTable("account_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: accountIssueKind("kind").notNull(),
  reason: text("reason").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: jsonb("body").$type<Array<Record<string, unknown>>>().notNull(),
  viewsCounter: integer("views_counter").notNull().default(0),
  averageRatings: doublePrecision("average_ratings"),
  status: postStatus("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    review: text("review"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ratings_post_user_unique").on(table.postId, table.userId),
    check(
      "ratings_score_range",
      sql`${table.score} >= 1 and ${table.score} <= 5`
    ),
  ]
)

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rooms_name_lower_unique").on(sql`lower(${table.name})`),
  ]
)

export const roomParticipants = pgTable(
  "room_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("room_participants_room_user_unique").on(
      table.roomId,
      table.userId
    ),
  ]
)

export const roomMessages = pgTable(
  "room_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("room_messages_room_created_idx").on(table.roomId, table.createdAt),
  ]
)

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  posts: many(posts),
  comments: many(comments),
  ratings: many(ratings),
  accountIssues: many(accountIssues, { relationName: "accountIssueSubject" }),
  issuedAccountIssues: many(accountIssues, {
    relationName: "accountIssueActor",
  }),
  createdRooms: many(rooms),
  roomParticipants: many(roomParticipants),
  roomMessages: many(roomMessages),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountIssuesRelations = relations(accountIssues, ({ one }) => ({
  user: one(users, {
    fields: [accountIssues.userId],
    references: [users.id],
    relationName: "accountIssueSubject",
  }),
  createdByUser: one(users, {
    fields: [accountIssues.createdBy],
    references: [users.id],
    relationName: "accountIssueActor",
  }),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  ratings: many(ratings),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}))

export const ratingsRelations = relations(ratings, ({ one }) => ({
  post: one(posts, {
    fields: [ratings.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [rooms.createdBy],
    references: [users.id],
  }),
  participants: many(roomParticipants),
  messages: many(roomMessages),
}))

export const roomParticipantsRelations = relations(
  roomParticipants,
  ({ one }) => ({
    room: one(rooms, {
      fields: [roomParticipants.roomId],
      references: [rooms.id],
    }),
    user: one(users, {
      fields: [roomParticipants.userId],
      references: [users.id],
    }),
  })
)

export const roomMessagesRelations = relations(roomMessages, ({ one }) => ({
  room: one(rooms, {
    fields: [roomMessages.roomId],
    references: [rooms.id],
  }),
  author: one(users, {
    fields: [roomMessages.authorId],
    references: [users.id],
  }),
}))
