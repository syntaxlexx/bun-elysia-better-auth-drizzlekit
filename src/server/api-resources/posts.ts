import type { posts as postsTable } from "../db/schema.ts"
import { comments } from "./comments.ts"
import type { CommentWithAuthor } from "./comments.ts"
import { iso } from "./dates.ts"
import { ratings } from "./ratings.ts"
import type { RatingSummary } from "./ratings.ts"
import { users } from "./users.ts"
import type { PublicUserName } from "./users.ts"

type PostRow = typeof postsTable.$inferSelect

export type PostWithAuthor = {
  post: PostRow
  author: PublicUserName
}

export type PostDetailSource = PostWithAuthor & {
  comments: Array<CommentWithAuthor>
  rating: RatingSummary
}

export const posts = {
  postPublicResource: ({ post, author }: PostWithAuthor) => ({
    id: post.id,
    authorId: post.authorId,
    authorName: users.publicUserResource(author).name,
    title: post.title,
    viewsCounter: post.viewsCounter,
    status: post.status,
    publishedAt: iso(post.publishedAt),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }),
  postResource: (row: PostWithAuthor) => ({
    ...posts.postPublicResource(row),
    body: row.post.body,
  }),
  postDetailResource: (row: PostDetailSource) => ({
    ...posts.postResource(row),
    comments: row.comments.map(comments.commentResource),
    rating: ratings.ratingResource(row.rating),
  }),
}
