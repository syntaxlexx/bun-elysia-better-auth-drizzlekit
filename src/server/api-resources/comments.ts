import type { comments as commentsTable } from "../db/schema.ts"
import { users } from "./users.ts"
import type { PublicUserName } from "./users.ts"

type CommentRow = typeof commentsTable.$inferSelect

export type CommentWithAuthor = {
  comment: CommentRow
  author: PublicUserName
}

export const comments = {
  commentResource: ({ comment, author }: CommentWithAuthor) => ({
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    authorName: users.publicUserResource(author).name,
    createdAt: comment.createdAt.toISOString(),
  }),
}
