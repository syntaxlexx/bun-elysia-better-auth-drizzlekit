ALTER TABLE "posts" ADD COLUMN "average_ratings" double precision;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "review" text;--> statement-breakpoint
UPDATE "posts" AS p
SET "average_ratings" = sub.average
FROM (
	SELECT "post_id", avg("score")::float8 AS average
	FROM "ratings"
	GROUP BY "post_id"
) AS sub
WHERE p."id" = sub."post_id";