import { and, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { db } from "../db/index.ts"
import { comments, posts, ratings, users } from "../db/schema.ts"
import { ServiceError } from "./errors.ts"

type UserRow = typeof users.$inferSelect
type PostRow = typeof posts.$inferSelect
type PostStatus = PostRow["status"]

type AuthorName = {
  id: string
  fname: string
  lname: string
}

type PostWithAuthor = {
  post: PostRow
  author: AuthorName
}

type PostInput = {
  title: string
  body: unknown
  status: string
  publishedAt?: string | null
}

function first<T>(rows: ReadonlyArray<T>): T | undefined {
  if (rows.length === 0) {
    return undefined
  }
  return rows[0]
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

function postQuery(filter?: SQL) {
  const query = db
    .select({
      post: posts,
      author: {
        id: users.id,
        fname: users.fname,
        lname: users.lname,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
  return filter ? query.where(filter) : query
}

async function findPost(postId: string): Promise<PostWithAuthor | undefined> {
  const rows = await postQuery(eq(posts.id, postId)).limit(1)
  return first(rows)
}

function storedAverage(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }
  const average = typeof value === "number" ? value : Number(value)
  return Number.isFinite(average) ? average : null
}

async function ratingFor(postId: string, actor: UserRow | null) {
  const [postRows, reviewRows] = await Promise.all([
    db
      .select({ averageRatings: posts.averageRatings })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1),
    db
      .select({
        id: ratings.id,
        score: ratings.score,
        review: ratings.review,
        userId: ratings.userId,
        createdAt: ratings.createdAt,
        fname: users.fname,
        lname: users.lname,
      })
      .from(ratings)
      .innerJoin(users, eq(ratings.userId, users.id))
      .where(eq(ratings.postId, postId))
      .orderBy(desc(ratings.createdAt)),
  ])
  const mine = actor
    ? reviewRows.find((row) => row.userId === actor.id)
    : undefined
  return {
    average: storedAverage(first(postRows)?.averageRatings),
    count: reviewRows.length,
    mine: mine?.score ?? null,
    myReview: mine?.review ?? null,
    reviews: reviewRows.map((row) => ({
      id: row.id,
      score: row.score,
      review: row.review,
      userId: row.userId,
      createdAt: row.createdAt,
      author: {
        id: row.userId,
        fname: row.fname,
        lname: row.lname,
      },
    })),
  }
}

async function refreshAverageRatings(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  postId: string
) {
  const rows = await tx
    .select({
      average: sql<number | string | null>`avg(${ratings.score})::float8`,
    })
    .from(ratings)
    .where(eq(ratings.postId, postId))
  await tx
    .update(posts)
    .set({ averageRatings: storedAverage(first(rows)?.average) })
    .where(eq(posts.id, postId))
}

async function commentsFor(postId: string) {
  return db
    .select({
      comment: comments,
      author: {
        id: users.id,
        fname: users.fname,
        lname: users.lname,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt))
}

async function detailFor(row: PostWithAuthor, actor: UserRow | null) {
  const [postComments, rating] = await Promise.all([
    commentsFor(row.post.id),
    ratingFor(row.post.id, actor),
  ])
  return { ...row, comments: postComments, rating }
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
  return rows
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
  return rows
}

export async function listAllPosts(actor: UserRow) {
  assertActive(actor)
  if (actor.role !== "ADMIN") {
    throw new ServiceError(403, {
      ok: false,
      message: "Admin access is required.",
    })
  }
  return postQuery().orderBy(desc(posts.updatedAt))
}

export async function listPublicPosts() {
  const now = new Date()
  const rows = await postQuery(
    and(
      eq(posts.status, "PUBLISHED"),
      or(isNull(posts.publishedAt), lte(posts.publishedAt, now))
    )
  ).orderBy(desc(sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`))
  return rows
}

export async function getPost(actor: UserRow | null, postId: string) {
  const row = await findPost(postId)
  const now = new Date()
  if (!row || !canRead(row.post, actor, now)) {
    throw missingPost()
  }

  if (isPublic(row.post, now) && actor?.id !== row.post.authorId) {
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
    comment,
    author: {
      id: actor.id,
      fname: actor.fname,
      lname: actor.lname,
    },
  }
}

function assertReview(review: string | undefined) {
  if (review === undefined) {
    return undefined
  }
  const text = review.trim()
  if (text.length > 2000) {
    throw new ServiceError(422, {
      ok: false,
      message: "Keep the review under 2000 characters.",
    })
  }
  return text.length === 0 ? null : text
}

export async function ratePost(
  actor: UserRow,
  postId: string,
  score: number,
  review?: string
) {
  await readablePost(actor, postId)
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new ServiceError(422, {
      ok: false,
      message: "Choose a rating from 1 to 5.",
    })
  }
  const text = assertReview(review)

  await db.transaction(async (tx) => {
    await tx
      .insert(ratings)
      .values({
        postId,
        userId: actor.id,
        score,
        review: text ?? null,
      })
      .onConflictDoUpdate({
        target: [ratings.postId, ratings.userId],
        set: {
          score,
          ...(text !== undefined ? { review: text } : {}),
        },
      })
    await refreshAverageRatings(tx, postId)
  })

  return ratingFor(postId, actor)
}
