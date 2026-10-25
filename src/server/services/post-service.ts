import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { db } from "../db/index.ts"
import { comments, posts, ratings, users } from "../db/schema.ts"
import { ServiceError } from "./errors.ts"

type UserRow = typeof users.$inferSelect
type PostRow = typeof posts.$inferSelect
type PostStatus = PostRow["status"]

export type PostSummary = {
  id: string
  authorId: string
  authorName: string
  title: string
  viewsCounter: number
  status: PostStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PostRecord = PostSummary & {
  body: Array<Record<string, unknown>>
}

export type PostComment = {
  id: string
  body: string
  authorId: string
  authorName: string
  createdAt: string
}

export type PostRating = {
  average: number | null
  count: number
  mine: number | null
}

export type PostDetail = PostRecord & {
  comments: Array<PostComment>
  rating: PostRating
}

type PostInput = {
  title: string
  body: unknown
  status: string
  publishedAt?: string | null
}

type JoinedPost = {
  post: PostRow
  fname: string
  lname: string
}

function first<T>(rows: ReadonlyArray<T>): T | undefined {
  if (rows.length === 0) {
    return undefined
  }
  return rows[0]
}

function iso(value: Date | null) {
  return value ? value.toISOString() : null
}

function missingPost() {
  return new ServiceError(404, { ok: false, message: "Post not found." })
}

function isPublic(post: Pick<PostRow, "status" | "publishedAt">, now: Date) {
  return (
    post.status === "PUBLISHED" &&
    (post.publishedAt === null || post.publishedAt.getTime() <= now.getTime())
  )
}

function canRead(post: PostRow, actor: UserRow | null, now: Date) {
  if (isPublic(post, now)) {
    return true
  }
  if (!actor) {
    return false
  }
  if (actor.id === post.authorId) {
    return true
  }
  return actor.role === "ADMIN" && actor.status === "ACTIVE"
}

function canEdit(post: PostRow, actor: UserRow) {
  if (actor.status !== "ACTIVE") {
    return false
  }
  return actor.id === post.authorId || actor.role === "ADMIN"
}

function assertActive(actor: UserRow) {
  if (actor.status !== "ACTIVE") {
    throw new ServiceError(403, {
      ok: false,
      message: "This account cannot manage posts.",
    })
  }
}

function assertBody(body: unknown) {
  if (
    !Array.isArray(body) ||
    body.some(
      (block) =>
        typeof block !== "object" || block === null || Array.isArray(block)
    )
  ) {
    throw new ServiceError(422, {
      ok: false,
      message: "Post body must be a document.",
    })
  }
  return body as Array<Record<string, unknown>>
}

function assertInput(input: PostInput) {
  const title = input.title.trim()
  if (!title) {
    throw new ServiceError(422, { ok: false, message: "Enter a title." })
  }
  if (input.status !== "DRAFT" && input.status !== "PUBLISHED") {
    throw new ServiceError(422, {
      ok: false,
      message: "Choose draft or published.",
    })
  }
  const status: PostStatus = input.status

  let publishedAt: Date | null = null
  if (input.publishedAt) {
    publishedAt = new Date(input.publishedAt)
    if (Number.isNaN(publishedAt.getTime())) {
      throw new ServiceError(422, {
        ok: false,
        message: "Enter a valid publish date.",
      })
    }
  }

  return {
    title,
    body: assertBody(input.body),
    status,
    publishedAt,
  }
}

function toSummary(row: JoinedPost): PostSummary {
  return {
    id: row.post.id,
    authorId: row.post.authorId,
    authorName: `${row.fname} ${row.lname}`,
    title: row.post.title,
    viewsCounter: row.post.viewsCounter,
    status: row.post.status,
    publishedAt: iso(row.post.publishedAt),
    createdAt: row.post.createdAt.toISOString(),
    updatedAt: row.post.updatedAt.toISOString(),
  }
}

function toRecord(row: JoinedPost): PostRecord {
  return {
    ...toSummary(row),
    body: row.post.body,
  }
}

function postQuery(filter?: SQL) {
  const query = db
    .select({
      post: posts,
      fname: users.fname,
      lname: users.lname,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
  return filter ? query.where(filter) : query
}

async function findPost(postId: string) {
  const rows = await postQuery(eq(posts.id, postId)).limit(1)
  return first(rows)
}

async function ratingFor(
  postId: string,
  actor: UserRow | null
): Promise<PostRating> {
  const rows = await db
    .select({ score: ratings.score, userId: ratings.userId })
    .from(ratings)
    .where(eq(ratings.postId, postId))
  const count = rows.length
  const mine = actor
    ? (rows.find((row) => row.userId === actor.id)?.score ?? null)
    : null
  return {
    average:
      count === 0
        ? null
        : rows.reduce((sum, row) => sum + row.score, 0) / count,
    count,
    mine,
  }
}

async function commentsFor(postId: string): Promise<Array<PostComment>> {
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      authorId: comments.authorId,
      createdAt: comments.createdAt,
      fname: users.fname,
      lname: users.lname,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt))

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    authorId: row.authorId,
    authorName: `${row.fname} ${row.lname}`,
    createdAt: row.createdAt.toISOString(),
  }))
}

async function detailFor(
  row: JoinedPost,
  actor: UserRow | null
): Promise<PostDetail> {
  const [postComments, rating] = await Promise.all([
    commentsFor(row.post.id),
    ratingFor(row.post.id, actor),
  ])
  return { ...toRecord(row), comments: postComments, rating }
}

export async function createPost(actor: UserRow, input: PostInput) {
  assertActive(actor)
  const value = assertInput(input)
  const rows = await db
    .insert(posts)
    .values({ ...value, authorId: actor.id })
    .returning({ id: posts.id })
  const created = first(rows)
  if (!created) {
    throw new ServiceError(422, {
      ok: false,
      message: "Could not create the post.",
    })
  }
  const row = await findPost(created.id)
  if (!row) {
    throw missingPost()
  }
  return detailFor(row, actor)
}

export async function updatePost(
  actor: UserRow,
  postId: string,
  input: PostInput
) {
  assertActive(actor)
  const existing = await findPost(postId)
  if (!existing || !canEdit(existing.post, actor)) {
    throw missingPost()
  }
  const value = assertInput(input)
  await db
    .update(posts)
    .set({ ...value, updatedAt: new Date() })
    .where(eq(posts.id, postId))
  const row = await findPost(postId)
  if (!row) {
    throw missingPost()
  }
  return detailFor(row, actor)
}

export async function deletePost(actor: UserRow, postId: string) {
  assertActive(actor)
  const existing = await findPost(postId)
  if (!existing || !canEdit(existing.post, actor)) {
    throw missingPost()
  }
  await db.delete(posts).where(eq(posts.id, postId))
  return { ok: true as const }
}

export async function listOwnPosts(actor: UserRow) {
  assertActive(actor)
  const rows = await postQuery(eq(posts.authorId, actor.id)).orderBy(
    desc(posts.updatedAt)
  )
  return rows.map(toRecord)
}

export async function listPostsByAuthor(actor: UserRow, authorId: string) {
  assertActive(actor)
  if (actor.id !== authorId && actor.role !== "ADMIN") {
    throw new ServiceError(403, {
      ok: false,
      message: "You cannot view these posts.",
    })
  }
  const rows = await postQuery(eq(posts.authorId, authorId)).orderBy(
    desc(posts.updatedAt)
  )
  return rows.map(toSummary)
}

export async function listAllPosts(actor: UserRow) {
  assertActive(actor)
  if (actor.role !== "ADMIN") {
    throw new ServiceError(403, {
      ok: false,
      message: "Admin access is required.",
    })
  }
  const rows = await postQuery().orderBy(desc(posts.updatedAt))
  return rows.map(toSummary)
}

export async function listPublicPosts() {
  const now = new Date()
  const rows = await postQuery(
    and(
      eq(posts.status, "PUBLISHED"),
      or(isNull(posts.publishedAt), lte(posts.publishedAt, now))
    )
  ).orderBy(desc(sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`))
  return rows.map(toSummary)
}

export async function getPost(actor: UserRow | null, postId: string) {
  const row = await findPost(postId)
  const now = new Date()
  if (!row || !canRead(row.post, actor, now)) {
    throw missingPost()
  }

  if (isPublic(row.post, now)) {
    const updated = await db
      .update(posts)
      .set({ viewsCounter: sql`${posts.viewsCounter} + 1` })
      .where(eq(posts.id, postId))
      .returning({ viewsCounter: posts.viewsCounter })
    const views = first(updated)
    if (views) {
      row.post.viewsCounter = views.viewsCounter
    }
  }

  return detailFor(row, actor)
}

async function readablePost(actor: UserRow, postId: string) {
  assertActive(actor)
  const row = await findPost(postId)
  const now = new Date()
  if (!row || !canRead(row.post, actor, now)) {
    throw missingPost()
  }
  return row
}

export async function addComment(actor: UserRow, postId: string, body: string) {
  await readablePost(actor, postId)
  const text = body.trim()
  if (!text) {
    throw new ServiceError(422, { ok: false, message: "Enter a comment." })
  }

  const rows = await db
    .insert(comments)
    .values({ postId, authorId: actor.id, body: text })
    .returning()
  const comment = first(rows)
  if (!comment) {
    throw new ServiceError(422, {
      ok: false,
      message: "Could not save the comment.",
    })
  }

  return {
    id: comment.id,
    body: comment.body,
    authorId: actor.id,
    authorName: `${actor.fname} ${actor.lname}`,
    createdAt: comment.createdAt.toISOString(),
  }
}

export async function ratePost(actor: UserRow, postId: string, score: number) {
  await readablePost(actor, postId)
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new ServiceError(422, {
      ok: false,
      message: "Choose a rating from 1 to 5.",
    })
  }

  await db
    .insert(ratings)
    .values({ postId, userId: actor.id, score })
    .onConflictDoUpdate({
      target: [ratings.postId, ratings.userId],
      set: { score },
    })

  return ratingFor(postId, actor)
}
