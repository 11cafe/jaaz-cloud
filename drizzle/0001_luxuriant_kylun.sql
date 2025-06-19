DO $$ BEGIN
 CREATE TYPE "public"."aspect_ratio" AS ENUM('1:1', '4:3', '3:4', '16:9', '9:16');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."generation_status" AS ENUM('pending', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."image_status" AS ENUM('active', 'hidden', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."model" AS ENUM('flux-kontext', 'gpt-4o');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "image_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"aspect_ratio" "aspect_ratio" NOT NULL,
	"model" "model" NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"generation_params" text,
	"status" "generation_status" DEFAULT 'completed' NOT NULL,
	"cost" numeric(10, 8),
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "image_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"image_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_images" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"aspect_ratio" "aspect_ratio" NOT NULL,
	"model" "model" NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"original_generation_id" text,
	"shared_at" timestamp(3) DEFAULT now() NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" "image_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "image_likes" ADD CONSTRAINT "image_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "image_likes" ADD CONSTRAINT "image_likes_image_id_shared_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."shared_images"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_images" ADD CONSTRAINT "shared_images_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shared_images" ADD CONSTRAINT "shared_images_original_generation_id_image_generations_id_fk" FOREIGN KEY ("original_generation_id") REFERENCES "public"."image_generations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_generations_user_id_idx" ON "image_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_generations_created_at_idx" ON "image_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_generations_status_idx" ON "image_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_likes_user_id_idx" ON "image_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_likes_image_id_idx" ON "image_likes" USING btree ("image_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "image_likes_user_image_unique" ON "image_likes" USING btree ("user_id","image_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_user_id_idx" ON "shared_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_status_idx" ON "shared_images" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_shared_at_idx" ON "shared_images" USING btree ("shared_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_like_count_idx" ON "shared_images" USING btree ("like_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_model_idx" ON "shared_images" USING btree ("model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_aspect_ratio_idx" ON "shared_images" USING btree ("aspect_ratio");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_images_featured_idx" ON "shared_images" USING btree ("is_featured","shared_at");