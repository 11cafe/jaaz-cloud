DO $$ BEGIN
 CREATE TYPE "public"."project_status" AS ENUM('draft', 'active', 'completed', 'shared', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."step_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover" text,
	"featured" jsonb,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"total_cost" numeric(10, 8) DEFAULT '0',
	"metadata" jsonb,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "step_outputs" (
	"id" text PRIMARY KEY NOT NULL,
	"step_id" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"format" text,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "steps" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"prompt" text,
	"model" text,
	"inputs" jsonb,
	"parameters" jsonb,
	"status" "step_status" DEFAULT 'pending' NOT NULL,
	"cost" numeric(10, 8),
	"error_message" text,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "shared_images";--> statement-breakpoint
DROP TABLE "image_likes";--> statement-breakpoint
DROP TABLE "images";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "step_outputs" ADD CONSTRAINT "step_outputs_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."steps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "steps" ADD CONSTRAINT "steps_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_is_public_idx" ON "projects" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_public_shared_idx" ON "projects" USING btree ("is_public","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_created_at_idx" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_like_count_idx" ON "projects" USING btree ("like_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_view_count_idx" ON "projects" USING btree ("view_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "step_outputs_step_id_idx" ON "step_outputs" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "step_outputs_step_order_idx" ON "step_outputs" USING btree ("step_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "step_outputs_type_idx" ON "step_outputs" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_project_id_idx" ON "steps" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_project_order_idx" ON "steps" USING btree ("project_id","step_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_status_idx" ON "steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "steps_created_at_idx" ON "steps" USING btree ("created_at");
