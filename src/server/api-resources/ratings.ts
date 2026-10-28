import type { PublicUserName } from "./users.ts"
import { users } from "./users.ts"

export type RatingReviewSource = {
  id: string
  score: number
  review: string | null
  userId: string
  createdAt: Date
  author: PublicUserName
}

export type RatingSummary = {
  average: number | null
  count: number
  mine: number | null
  myReview: string | null
}

export const ratings = {
  ratingResource: (rating: RatingSummary) => ({
    average: rating.average,
    count: rating.count,
    mine: rating.mine,
    myReview: rating.myReview,
  }),
  reviewResource: (review: RatingReviewSource) => ({
    id: review.id,
    score: review.score,
    review: review.review,
    userId: review.userId,
    authorName: users.publicUserResource(review.author).name,
    createdAt: review.createdAt.toISOString(),
  }),
}
