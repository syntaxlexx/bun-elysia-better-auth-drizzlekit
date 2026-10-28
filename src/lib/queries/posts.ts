import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { getTreaty } from "@api"
import { isOwnedPostList, isPostDetail, isPostList } from "@/lib/records"
import { reject, unwrap } from "@/lib/queries/api"

export const postKeys = {
  all: ["posts"] as const,
  publicList: ["posts", "public"] as const,
  mine: ["posts", "mine"] as const,
  admin: ["posts", "admin"] as const,
  detail: (postId: string) => ["posts", "detail", postId] as const,
}

export type PostWrite = {
  title: string
  body: Array<Record<string, unknown>>
  status: "DRAFT" | "PUBLISHED"
  publishedAt: string | null
}

export function publicPostsQuery() {
  return queryOptions({
    queryKey: postKeys.publicList,
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(await api.posts.get(), isPostList, "Could not load posts.")
    },
  })
}

export function ownPostsQuery() {
  return queryOptions({
    queryKey: postKeys.mine,
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.me.posts.get(),
        isOwnedPostList,
        "Could not load your posts."
      )
    },
  })
}

export function adminPostsQuery() {
  return queryOptions({
    queryKey: postKeys.admin,
    queryFn: async () => {
      const { api } = await getTreaty()
      return unwrap(
        await api.admin.posts.get(),
        isPostList,
        "Could not load posts."
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
