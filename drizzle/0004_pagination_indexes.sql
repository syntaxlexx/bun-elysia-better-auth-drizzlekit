CREATE INDEX "comments_post_created_idx" ON "comments" USING btree ("post_id","created_at","id");--> statement-breakpoint
CREATE INDEX "posts_public_shelf_idx" ON "posts" USING btree (coalesce("published_at", "created_at") desc,"id" desc) WHERE "posts"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE INDEX "posts_updated_idx" ON "posts" USING btree ("updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_author_updated_idx" ON "posts" USING btree ("author_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ratings_post_created_idx" ON "ratings" USING btree ("post_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "users" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);