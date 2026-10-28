import { Elysia, t } from "elysia"
import { resources } from "../api-resources/index.ts"
import { readActor, requireActiveUser } from "../auth/guard.ts"
import { run } from "../http.ts"
import { pageQuery, readPage } from "../pagination.ts"
import {
  addComment,
  createPost,
  deletePost,
  getPost,
  listComments,
  listOwnPosts,
  listPublicPosts,
  listReviews,
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
  .get(
    "/posts",
    ({ query, set }) =>
      run(set, async () => {
        const page = await listPublicPosts(readPage(query))
        return {
          items: page.items.map(resources.posts.postPublicResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
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
  .get(
    "/me/posts",
    ({ query, request, set }) =>
      run(set, async () => {
        const page = await listOwnPosts(
          await requireActiveUser(request),
          readPage(query)
        )
        return {
          items: page.items.map(resources.posts.postResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
  )
  .get(
    "/posts/:postId/comments",
    ({ params, query, request, set }) =>
      run(set, async () => {
        const page = await listComments(
          await readActor(request),
          params.postId,
          readPage(query)
        )
        return {
          items: page.items.map(resources.comments.commentResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
  )
  .get(
    "/posts/:postId/reviews",
    ({ params, query, request, set }) =>
      run(set, async () => {
        const page = await listReviews(
          await readActor(request),
          params.postId,
          readPage(query)
        )
        return {
          items: page.items.map(resources.ratings.reviewResource),
          meta: page.meta,
        }
      }),
    { query: pageQuery }
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
            body.score,
            body.review
          )
        )
      ),
    {
      body: t.Object({
        score: t.Number(),
        review: t.Optional(t.String()),
      }),
    }
  )
