import {
  pgTable,
  pgEnum,
  timestamp,
  text,
  integer,
  decimal,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { UserSchema } from "./index";

// Gallery related enums
export const aspectRatioEnum = pgEnum("aspect_ratio", [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
]);

export const modelEnum = pgEnum("model", ["flux-kontext", "gpt-4o"]);

export const imageStatusEnum = pgEnum("image_status", [
  "active",
  "hidden",
  "deleted",
]);

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "completed",
  "failed",
]);

// Image generation records table
export const ImageGenerationsSchema = pgTable(
  "image_generations",
  {
    id: text("id").primaryKey().notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
    prompt: text("prompt").notNull(),
    aspect_ratio: aspectRatioEnum("aspect_ratio").notNull(),
    model: modelEnum("model").notNull(),
    image_url: text("image_url").notNull(),
    thumbnail_url: text("thumbnail_url"),
    generation_params: text("generation_params"), // JSON string
    status: generationStatusEnum("status").default("completed").notNull(),
    cost: decimal("cost", { precision: 10, scale: 8 }),
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userId_idx: index("image_generations_user_id_idx").on(table.user_id),
      createdAt_idx: index("image_generations_created_at_idx").on(
        table.created_at,
      ),
      status_idx: index("image_generations_status_idx").on(table.status),
    };
  },
);

// Shared images table for gallery
export const SharedImagesSchema = pgTable(
  "shared_images",
  {
    id: text("id").primaryKey().notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
    prompt: text("prompt").notNull(),
    aspect_ratio: aspectRatioEnum("aspect_ratio").notNull(),
    model: modelEnum("model").notNull(),
    image_url: text("image_url").notNull(),
    thumbnail_url: text("thumbnail_url"),
    original_generation_id: text("original_generation_id").references(
      () => ImageGenerationsSchema.id,
    ),
    shared_at: timestamp("shared_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
    view_count: integer("view_count").default(0).notNull(),
    like_count: integer("like_count").default(0).notNull(),
    is_featured: boolean("is_featured").default(false).notNull(),
    status: imageStatusEnum("status").default("active").notNull(),
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userId_idx: index("shared_images_user_id_idx").on(table.user_id),
      status_idx: index("shared_images_status_idx").on(table.status),
      sharedAt_idx: index("shared_images_shared_at_idx").on(table.shared_at),
      likeCount_idx: index("shared_images_like_count_idx").on(table.like_count),
      model_idx: index("shared_images_model_idx").on(table.model),
      aspectRatio_idx: index("shared_images_aspect_ratio_idx").on(
        table.aspect_ratio,
      ),
      featured_idx: index("shared_images_featured_idx").on(
        table.is_featured,
        table.shared_at,
      ),
    };
  },
);

// Image likes table
export const ImageLikesSchema = pgTable(
  "image_likes",
  {
    id: text("id").primaryKey().notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
    image_id: text("image_id")
      .references(() => SharedImagesSchema.id)
      .notNull(),
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userId_idx: index("image_likes_user_id_idx").on(table.user_id),
      imageId_idx: index("image_likes_image_id_idx").on(table.image_id),
      unique_user_image: uniqueIndex("image_likes_user_image_unique").on(
        table.user_id,
        table.image_id,
      ),
    };
  },
);

// Export gallery schemas
export const gallerySchemas = {
  image_generations: ImageGenerationsSchema,
  shared_images: SharedImagesSchema,
  image_likes: ImageLikesSchema,
};
