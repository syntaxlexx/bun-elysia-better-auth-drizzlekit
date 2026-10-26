import { Hono } from "hono"
import { z } from "zod"
import { resources } from "../api-resources/index.ts"
import { readActor, requireActiveUser } from "../auth/guard.ts"
import type { AuthEnv } from "../auth/guard.ts"
import { jsonBody, run } from "../http.ts"
import {
  addComment,
  createPost,
  deletePost,
  getPost,
  listOwnPosts,
  listPublicPosts,
  ratePost,
  updatePost,
} from "../services/post-service.ts"

const postBody = z.object({
  title: z.string(),
  body: z.array(z.record(z.string(), z.unknown())),
  status: z.union([z.literal("DRAFT"), z.literal("PUBLISHED")]),
  publishedAt: z.string().nullable().optional(),
})

export const postRoutes = new Hono<AuthEnv>()
  .get("/posts", async (c) =>
    c.json((await listPublicPosts()).map(resources.posts.postPublicResource))
  )
  .get("/posts/:postId", (c) =>
    run(c, async () =>
      resources.posts.postDetailResource(
        await getPost(await readActor(c.req.raw), c.req.param("postId"))
      )
    )
  )
  .post("/posts", requireActiveUser, jsonBody(postBody), (c) =>
    run(c, async () =>
      resources.posts.postDetailResource(
        await createPost(c.get("user"), c.req.valid("json"))
      )
    )
  )
  .patch("/posts/:postId", requireActiveUser, jsonBody(postBody), (c) =>
    run(c, async () =>
      resources.posts.postDetailResource(
        await updatePost(
          c.get("user"),
          c.req.param("postId"),
          c.req.valid("json")
        )
      )
    )
  )
  .delete("/posts/:postId", requireActiveUser, (c) =>
    run(c, async () => deletePost(c.get("user"), c.req.param("postId")))
  )
  .get("/me/posts", requireActiveUser, (c) =>
    run(c, async () =>
      (await listOwnPosts(c.get("user"))).map(resources.posts.postResource)
    )
  )
  .post(
    "/posts/:postId/comments",
    requireActiveUser,
    jsonBody(z.object({ body: z.string() })),
    (c) =>
      run(c, async () =>
        resources.comments.commentResource(
          await addComment(
            c.get("user"),
            c.req.param("postId"),
            c.req.valid("json").body
          )
        )
      )
  )
  .put(
    "/posts/:postId/rating",
    requireActiveUser,
    jsonBody(
      z.object({
        score: z.number(),
        review: z.string().optional(),
      })
    ),
    (c) =>
      run(c, async () => {
        const body = c.req.valid("json")
        return resources.ratings.ratingResource(
          await ratePost(
            c.get("user"),
            c.req.param("postId"),
            body.score,
            body.review
          )
        )
      })
  )
