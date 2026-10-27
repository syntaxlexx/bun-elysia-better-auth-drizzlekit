CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'email_verified_at'
	) THEN
		EXECUTE $sql$
			UPDATE "users"
			SET
				"name" = COALESCE("name", btrim("fname" || ' ' || "lname")),
				"email" = COALESCE(
					"email",
					regexp_replace(COALESCE("phone", "id"::text), '[^0-9A-Za-z]', '', 'g') || '@migrated.folio.local'
				),
				"email_verified" = COALESCE("email_verified", false) OR "email_verified_at" IS NOT NULL,
				"phone_number_verified" = COALESCE("phone_number_verified", false) OR "phone_verified_at" IS NOT NULL
		$sql$;
	ELSE
		UPDATE "users"
		SET
			"name" = COALESCE("name", btrim("fname" || ' ' || "lname")),
			"email" = COALESCE(
				"email",
				regexp_replace(COALESCE("phone", "id"::text), '[^0-9A-Za-z]', '', 'g') || '@migrated.folio.local'
			);
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'password_hash'
	) THEN
		INSERT INTO "accounts" ("account_id", "provider_id", "user_id", "password")
		SELECT "id"::text, 'credential', "id", "password_hash"
		FROM "users"
		WHERE "password_hash" IS NOT NULL
			AND NOT EXISTS (
				SELECT 1
				FROM "accounts"
				WHERE "accounts"."user_id" = "users"."id"
					AND "accounts"."provider_id" = 'credential'
			);
		ALTER TABLE "users" DROP COLUMN "password_hash";
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'sessions'
			AND column_name = 'token_hash'
	) THEN
		DELETE FROM "sessions";
		ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "token" text;
		ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ip_address" text;
		ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_agent" text;
		ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
		UPDATE "sessions" SET "updated_at" = COALESCE("updated_at", now());
		ALTER TABLE "sessions" ALTER COLUMN "token" SET NOT NULL;
		ALTER TABLE "sessions" ALTER COLUMN "updated_at" SET NOT NULL;
		ALTER TABLE "sessions" DROP COLUMN "token_hash";
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "accounts"
		ADD CONSTRAINT "accounts_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications" USING btree ("identifier");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_unique" ON "sessions" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "token_hash";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_verified_at";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'image'
	) THEN
		UPDATE "users" SET "avatar_url" = "image" WHERE "avatar_url" IS NULL AND "image" IS NOT NULL;
		ALTER TABLE "users" DROP COLUMN "image";
	END IF;
END $$;
