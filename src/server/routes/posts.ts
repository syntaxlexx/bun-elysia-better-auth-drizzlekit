import { Elysia, t } from "elysia"
import { resources } from "../api-resources/index.ts"
import { readActor, requireActiveUser } from "../auth/guard.ts"
import { run } from "../http.ts"
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

const postBody = t.Object({
  title: t.String(),
  body: t.Array(t.Record(t.String(), t.Unknown())),
  status: t.Union([t.Literal("DRAFT"), t.Literal("PUBLISHED")]),
  publishedAt: t.Optional(t.Union([t.String(), t.Null()])),
})

export const postRoutes = new Elysia()
  .get("/posts", async () =>
    (await listPublicPosts()).map(resources.posts.postPublicResource)
  )
  .get("/posts/:postId", ({ params, request, set }) =>
    run(set, async () =>
      resources.posts.postDetailResource(
        await getPost(await readActor(request), params.postId)
      )
    )
  )
  .post(
    "/posts",
    ({ body, request, set }) =>
      run(set, async () =>
        resources.posts.postDetailResource(
          await createPost(await requireActiveUser(request), body)
        )
      ),
    { body: postBody }
  )
  .patch(
    "/posts/:postId",
    ({ params, body, request, set }) =>
      run(set, async () =>
        resources.posts.postDetailResource(
          await updatePost(
            await requireActiveUser(request),
            params.postId,
            body
          )
        )
      ),
    { body: postBody }
  )
  .delete("/posts/:postId", ({ params, request, set }) =>
    run(set, async () =>
      deletePost(await requireActiveUser(request), params.postId)
    )
  )
  .get("/me/posts", ({ request, set }) =>
    run(set, async () =>
      (await listOwnPosts(await requireActiveUser(request))).map(
        resources.posts.postResource
      )
    )
  )
  .post(
    "/posts/:postId/comments",
    ({ params, body, request, set }) =>
      run(set, async () =>
        resources.comments.commentResource(
          await addComment(
            await requireActiveUser(request),
            params.postId,
            body.body
          )
        )
      ),
    { body: t.Object({ body: t.String() }) }
  )
  .put(
    "/posts/:postId/rating",
    ({ params, body, request, set }) =>
      run(set, async () =>
        resources.ratings.ratingResource(
          await ratePost(
            await requireActiveUser(request),
            params.postId,
            body.score
          )
        )
      ),
    { body: t.Object({ score: t.Number() }) }
  )
