export type RatingSummary = {
  average: number | null
  count: number
  mine: number | null
}

export const ratings = {
  ratingResource: (rating: RatingSummary) => ({
    average: rating.average,
    count: rating.count,
    mine: rating.mine,
  }),
}
