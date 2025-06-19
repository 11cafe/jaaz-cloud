-- Create image-related enums
DO $$ BEGIN
 CREATE TYPE "image_status" AS ENUM('active', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "generation_status" AS ENUM('pending', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create images table with text fields for model and aspect_ratio
CREATE TABLE IF NOT EXISTS "images" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"image_data" text NOT NULL,
	"image_format" text DEFAULT 'png' NOT NULL,
	"file_size" integer,
	"prompt" text,
	"aspect_ratio" text,
	"model" text,
	"generation_params" text,
	"generation_status" "generation_status" DEFAULT 'completed',
	"cost" numeric(10, 8),
	"status" "image_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Create shared_images table
CREATE TABLE IF NOT EXISTS "shared_images" (
	"id" text PRIMARY KEY NOT NULL,
	"image_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"shared_at" timestamp(3) DEFAULT now() NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" "image_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Create image_likes table
CREATE TABLE IF NOT EXISTS "image_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"image_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "images" ADD CONSTRAINT "images_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "shared_images" ADD CONSTRAINT "shared_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "shared_images" ADD CONSTRAINT "shared_images_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "image_likes" ADD CONSTRAINT "image_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "image_likes" ADD CONSTRAINT "image_likes_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "images_user_id_idx" ON "images" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "images_status_idx" ON "images" USING btree ("status");
CREATE INDEX IF NOT EXISTS "images_created_at_idx" ON "images" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "images_generation_status_idx" ON "images" USING btree ("generation_status");
CREATE INDEX IF NOT EXISTS "images_model_idx" ON "images" USING btree ("model");
CREATE INDEX IF NOT EXISTS "shared_images_image_id_idx" ON "shared_images" USING btree ("image_id");
CREATE INDEX IF NOT EXISTS "shared_images_user_id_idx" ON "shared_images" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "shared_images_status_idx" ON "shared_images" USING btree ("status");
CREATE INDEX IF NOT EXISTS "shared_images_shared_at_idx" ON "shared_images" USING btree ("shared_at");
CREATE INDEX IF NOT EXISTS "shared_images_like_count_idx" ON "shared_images" USING btree ("like_count");
CREATE INDEX IF NOT EXISTS "shared_images_featured_idx" ON "shared_images" USING btree ("is_featured","shared_at");
CREATE INDEX IF NOT EXISTS "image_likes_user_id_idx" ON "image_likes" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "image_likes_image_id_idx" ON "image_likes" USING btree ("image_id");
CREATE UNIQUE INDEX IF NOT EXISTS "image_likes_user_image_unique" ON "image_likes" USING btree ("user_id","image_id");
