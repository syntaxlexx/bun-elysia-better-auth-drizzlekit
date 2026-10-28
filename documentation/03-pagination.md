# Pagination

This file is the source of truth for the pagination pass. Implement the phases in order. Keep behavior inside the decisions in this file.

Every list a page renders currently returns the whole table. `listPublicPosts`, `listOwnPosts`, `listAllPosts`, `listPostsByAuthor`, and `listUsers` have no `limit`. `commentsFor` and `ratingFor` load every comment and every review onto the post. Those screens are tables and short archives, so each list is a page number plus a total. The page can show "2 of 6" and jump to the next page. The router owns the URL. The payload carries the counts.

Chat history stays the latest 100 messages defined in `documentation/02-live-chat.md`. Room lists stay a full list. Account issues stay the full history on `GET /api/admin/users/:userId`.

## Page shape

List routes stop returning a bare array. Each one returns:

```json
{
  "items": [],
  "meta": {
    "currentPage": 1,
    "perPage": 10,
    "from": 1,
    "to": 10,
    "total": 45,
    "lastPage": 5
  }
}
```

`items` is the same resource objects the route returns today, in the same order. `from` and `to` are null when `total` is 0. `lastPage` is 1 when `total` is 0, and otherwise `ceil(total / perPage)`.

Query string, on every paginated route:

| param   | rule                                       |
| ------- | ------------------------------------------ |
| `page`  | optional integer, default 1, minimum 1     |
| `limit` | optional, one of 10, 20, or 50, default 10 |

A missing `page` is 1. A missing `limit` is 10. A `page` below 1, or a `limit` other than 10, 20, or 50, is `422` `{ ok: false, message }`. `page` past `lastPage` is `422` `{ ok: false, message: "That page is past the end of the list." }`. Page 1 of an empty list is `200` with `items: []`, `from: null`, `to: null`, `total: 0`, and `lastPage: 1`.

The service runs `count(*)` with the same filter as the list, then `limit` / `offset` where `offset` is `(page - 1) * perPage`. Pages omit `limit` when it is 10. `page` and the page size live in the route search params so a loader can request that page and the URL can be opened again. Changing the page size returns to page 1.

`ORDER BY` keeps the timestamp the query uses today and adds `id` in the same direction. Two rows that share a timestamp then stay in a stable order between requests.

## Lists

| route                                | auth             | order                                                 |
| ------------------------------------ | ---------------- | ----------------------------------------------------- |
| `GET /api/posts`                     | public           | `coalesce(published_at, created_at) desc, id desc`    |
| `GET /api/me/posts`                  | active session   | `updated_at desc, id desc`                            |
| `GET /api/admin/posts`               | admin            | `updated_at desc, id desc`                            |
| `GET /api/admin/users`               | admin            | `created_at desc, id desc`                            |
| `GET /api/admin/users/:userId/posts` | admin            | `updated_at desc, id desc`, and `author_id = :userId` |
| `GET /api/posts/:postId/comments`    | same as the post | `created_at asc, id asc`                              |
| `GET /api/posts/:postId/reviews`     | same as the post | `created_at desc, id desc`                            |

`GET /api/posts` keeps the public filter: `status = PUBLISHED` and `published_at` is null or `<= now()`.

`GET /api/me/posts` stays limited to `author_id` of the signed-in user. `GET /api/admin/posts` stays every status. The edit screen loads `GET /api/posts/:postId` for that one post. It does not scan `GET /api/me/posts`.

`GET /api/admin/users/:userId` stops embedding `posts`. The posts tab loads `GET /api/admin/users/:userId/posts`. A missing user is `404`. The actor is an active admin. Issues remain on the user detail.

`GET /api/posts/:postId` stops embedding the comment array and the review array. It still returns the post, and `rating` still returns `average`, `count`, `mine`, and `myReview`. `count` comes from `count(*)` on `ratings` for that post. `average` stays the stored `posts.average_ratings`. `mine` and `myReview` are the signed-in user's rating row, or null. Comments and reviews are the two list routes above. Both use the same read check as `getPost`: a hidden draft or a scheduled post is `404` for anyone except the author and an active admin.

Comment items stay the comment resource. Review items stay the objects that were inside `rating.reviews`.

Eden calls pass the query on `.get({ query })`. Loaders keep using `getTreaty()`.

## Indexes

Add these in `src/server/db/schema.ts`, then:

```bash
bun run db:generate -- --name pagination_indexes
bun run db:migrate
```

The index column order matches the `ORDER BY`.

| index                       | columns                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| `posts_public_shelf_idx`    | `(coalesce(published_at, created_at) desc, id desc)` where `status = 'PUBLISHED'` |
| `posts_updated_idx`         | `(updated_at desc, id desc)`                                                      |
| `posts_author_updated_idx`  | `(author_id, updated_at desc, id desc)`                                           |
| `users_created_idx`         | `(created_at desc, id desc)`                                                      |
| `comments_post_created_idx` | `(post_id, created_at, id)`                                                       |
| `ratings_post_created_idx`  | `(post_id, created_at desc, id desc)`                                             |

`posts_updated_idx` serves the admin list of every post. `posts_author_updated_idx` serves the author's own posts and the admin posts-by-user list. The partial shelf index includes scheduled posts; the query's `published_at` predicate excludes them.

## Pages

Each list page reads its page number and page size from search. An absent or invalid page requests page 1. An absent or invalid page size requests 10. The loader passes both to Treaty. The control shows `from`–`to` of `total` when `from` and `to` are numbers. PreviousPage and NextPage sit in the pagination row. Each is a link when that direction has a page, and a non-clickable button when it does not. A list whose `lastPage` is 1 still shows the page item, and that item is not a link. A dropdown on the control sets the page size to 10, 20, or 50 and returns to page 1.

| route                        | search param                                                   |
| ---------------------------- | -------------------------------------------------------------- |
| `/posts`                     | `page`, `perPage`                                              |
| `/dashboard/posts`           | `page`, `perPage`                                              |
| `/admin/posts`               | `page`, `perPage`                                              |
| `/admin/users`               | `page`, `perPage`                                              |
| `/admin/users/$userId/posts` | `page`, `perPage`                                              |
| `/posts/$postId`             | `commentPage`, `commentPerPage`, `reviewPage`, `reviewPerPage` |
| `/dashboard/posts/$postId`   | `commentPage`, `commentPerPage`, `reviewPage`, `reviewPerPage` |

`validateSearch` coerces a missing or invalid page to 1 and a missing or invalid page size to 10. Page 1 is omitted from the URL. A page size of 10 is omitted. `commentPage` and `reviewPage` are omitted when they are 1. `commentPerPage` and `reviewPerPage` are omitted when they are 10. The post page loader requests the post, the comment page, and the review page together. The dashboard post page does the same.

An empty first page keeps the copy already on that screen (`Nothing on the shelf yet.`, `No users yet.`, `No comments yet.`).

`src/lib/records.ts` gains `PageMeta` and a page guard: `items` is an array of the existing item guard, and `meta` matches the shape above. List loaders switch to that guard. `PostDetail` drops `comments`. `rating` drops `reviews`. `AdminUserDetail` drops `posts`. `src/lib/queries/users.ts` loads the user and issues only. `/admin/users/$userId/posts` loads the posts page on its own.

The control is `Paginator` in `src/components/paginator.tsx`. It uses the shadcn pagination component: PreviousPage, numbered pages, and NextPage, plus a results-per-page select. Page numbers stay within one step of the current page, with the first page, the last page, and an ellipsis when a gap is wider than one page.

## Files

- `src/server/pagination.ts` — `readPage`, `offsetFor`, `toPage`.
- `src/server/db/schema.ts` — indexes above.
- `src/server/services/post-service.ts` — page arguments on the four post lists, `listComments`, and `listReviews`. `ratingFor` returns the summary without every review.
- `src/server/services/user-service.ts` — `listUsers` takes the page arguments.
- `src/server/routes/posts.ts` and `src/server/routes/admin.ts` — `pageQuery` on the list routes, plus `GET /api/admin/users/:userId/posts`, `GET /api/posts/:postId/comments`, and `GET /api/posts/:postId/reviews`.
- `src/server/api-resources/posts.ts` and `src/server/api-resources/ratings.ts` — detail and rating resources match the trimmed payload.
- `src/components/paginator.tsx` — shadcn pagination wired to the route search param.
- `src/lib/records.ts`, `src/lib/queries/posts.ts`, `src/lib/queries/users.ts`, and the list routes under `src/routes`.

Single-record routes stay as they are: one post, one user, create, update, delete, one comment write, one rating write.

## Phases

### Phase 1 — Page helper and indexes

Files: `src/server/pagination.ts`, `src/server/db/schema.ts`, migration `pagination_indexes`.

Done when a service can ask for page 1 of 10 and the migration applies.

### Phase 2 — Post and user lists

Files: post and user services, `posts.ts` and `admin.ts` routes, the shelf, dashboard posts, admin posts, admin users, and the admin user's posts tab.

Done when each of those screens shows one page and follows `page`, and a signed-out caller still cannot read drafts from `GET /api/posts`.

### Phase 3 — Comments and reviews

Files: `listComments`, `listReviews`, `getPost` / `ratingFor`, the public post page, and the dashboard post page.

Done when opening a post returns the first page of comments and the first page of reviews, `rating.count` matches the number of rating rows, and the next page follows `commentPage` or `reviewPage`.

## Acceptance

- `vp check` and `vp run typecheck` pass.
- `GET /api/posts` with no query returns at most 10 public posts, newest `coalesce(published_at, created_at)` first, with `id` breaking ties, and `meta.total` counting the same filter.
- `GET /api/posts?page=2&limit=10` returns the next 10 public posts and no id from page 1.
- `limit=1`, `limit=51`, `page=0`, and a `page` past `lastPage` are `422`.
- `GET /api/admin/users/:userId` no longer contains `posts`.
- `GET /api/posts/:postId` no longer contains a comments array or `rating.reviews`.
- `GET /api/posts/:postId/comments` on a draft is `404` for a caller who cannot read that post.
- Chat `listMessages` is unchanged.
