CREATE TABLE IF NOT EXISTS "account" (
	"id" integer PRIMARY KEY NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_auth_requests" (
	"device_code" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"access_token" text,
	"status" text NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" integer,
	"amount" numeric(100, 2) NOT NULL,
	"stripe_session_id" text,
	"transaction_type" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"previous_balance" numeric(100, 2) NOT NULL,
	"after_balance" numeric(100, 2) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"image_url" text,
	"updated_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"oauth_sub" text NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_authorid_idx" ON "transactions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_stripe_session_id_idx" ON "transactions" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_transaction_type_idx" ON "transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user" USING btree ("username");