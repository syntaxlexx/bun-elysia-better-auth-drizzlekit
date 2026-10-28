import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { getTreaty } from "@api"
import {
  isCommentItem,
  isOwnedPost,
  isPage,
  isPostDetail,
  isPostSummary,
  isReviewItem,
  pageQuery,
} from "@/lib/records"
import type {
  CommentItem,
  OwnedPost,
  Page,
  PostSummary,
  ReviewItem,
} from "@/lib/records"
import { reject, unwrap } from "@/lib/queries/api"

export const postKeys = {
  all: ["posts"] as const,
  publicList: (page: number, perPage: number) =>
    ["posts", "public", page, perPage] as const,
  mine: (page: number, perPage: number) =>
    ["posts", "mine", page, perPage] as const,
  admin: (page: number, perPage: number) =>
    ["posts", "admin", page, perPage] as const,
  author: (userId: string, page: number, perPage: number) =>
    ["posts", "author", userId, page, perPage] as const,
  detail: (postId: string) => ["posts", "detail", postId] as const,
  comments: (postId: string, page: number, perPage: number) =>
    ["posts", "comments", postId, page, perPage] as const,
  reviews: (postId: string, page: number, perPage: number) =>
    ["posts", "reviews", postId, page, perPage] as const,
}

export type PostWrite = {
  title: string
  body: Array<Record<string, unknown>>
  status: "DRAFT" | "PUBLISHED"
  publishedAt: string | null
}

function isPostPage(data: unknown): data is Page<PostSummary> {
  return isPage(data, isPostSummary)
}

function isOwnedPostPage(data: unknown): data is Page<OwnedPost> {
  return isPage(data, isOwnedPost)
}

function isCommentPage(data: unknown): data is Page<CommentItem> {
  return isPage(data, isCommentItem)
}

function isReviewPage(data: unknown): data is Page<ReviewItem> {
  return isPage(data, isReviewItem)
}

export function publicPostsQuery(page: number, perPage: number) {
  return queryOptions({
    queryKey: postKeys.publicList(page, perPage),
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.posts.get({ query: pageQuery(page, perPage) }),
        isPostPage,
        "Could not load posts."
      )
    },
  })
}

export function ownPostsQuery(page: number, perPage: number) {
  return queryOptions({
    queryKey: postKeys.mine(page, perPage),
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.me.posts.get({ query: pageQuery(page, perPage) }),
        isOwnedPostPage,
        "Could not load your posts."
      )
    },
  })
}

export function adminPostsQuery(page: number, perPage: number) {
  return queryOptions({
    queryKey: postKeys.admin(page, perPage),
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.admin.posts.get({ query: pageQuery(page, perPage) }),
        isPostPage,
        "Could not load posts."
      )
    },
  })
}

export function authorPostsQuery(
  userId: string,
  page: number,
  perPage: number
) {
  return queryOptions({
    queryKey: postKeys.author(userId, page, perPage),
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.admin
          .users({ userId })
          .posts.get({ query: pageQuery(page, perPage) }),
        isPostPage,
        "Could not load posts."
      )
    },
  })
}

export function postCommentsQuery(
  postId: string,
  page: number,
  perPage: number
) {
  return queryOptions({
    queryKey: postKeys.comments(postId, page, perPage),
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api
          .posts({ postId })
          .comments.get({ query: pageQuery(page, perPage) }),
        isCommentPage,
        "Could not load comments."
      )
    },
  })
}

export function postReviewsQuery(
  postId: string,
  page: number,
  perPage: number
) {
  return queryOptions({
    queryKey: postKeys.reviews(postId, page, perPage),
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api
          .posts({ postId })
          .reviews.get({ query: pageQuery(page, perPage) }),
        isReviewPage,
        "Could not load reviews."
      )
    },
  })
}

export function postDetailQuery(postId: string) {
  return queryOptions({
    queryKey: postKeys.detail(postId),
    queryFn: async () => {
      const { api } = await getTreaty()
      const result = await api.posts({ postId }).get()
      if (result.error || !isPostDetail(result.data)) {
        throw notFound()
      }
      return result.data
    },
  })
}

export async function savePost(postId: string | undefined, payload: PostWrite) {
  const { api } = await getTreaty()
  const result = postId
    ? await api.posts({ postId }).patch(payload)
    : await api.posts.post(payload)
  if (result.error) {
    reject(result.error, "Could not save the post.")
  }
  const saved = result.data
  if (
    typeof saved === "object" &&
    "id" in saved &&
    typeof saved.id === "string"
  ) {
    return saved.id
  }
  return postId ?? null
}

export async function deletePost(postId: string) {
  const { api } = await getTreaty()
  const result = await api.posts({ postId }).delete()
  if (result.error) {
    reject(result.error, "Could not delete the post.")
  }
}

export async function addPostComment(postId: string, body: string) {
  const { api } = await getTreaty()
  const result = await api.posts({ postId }).comments.post({ body })
  if (result.error) {
    reject(result.error, "Could not save the comment.")
  }
}

export async function ratePost(postId: string, score: number, review: string) {
  const { api } = await getTreaty()
  const result = await api.posts({ postId }).rating.put({ score, review })
  if (result.error) {
    reject(result.error, "Could not save the rating.")
  }
}
