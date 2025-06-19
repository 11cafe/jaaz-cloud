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

// Image status enum
export const imageStatusEnum = pgEnum("image_status", ["active", "deleted"]);

// Generation status enum
export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "completed",
  "failed",
]);

// Core images table - stores all images with generation metadata
export const ImagesSchema = pgTable(
  "images",
  {
    id: text("id").primaryKey().notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
    image_data: text("image_data").notNull(), // Base64 encoded image
    image_format: text("image_format").notNull().default("png"), // png, jpg, webp
    file_size: integer("file_size"), // File size in bytes
    prompt: text("prompt"), // Generation prompt (null for uploaded images)
    aspect_ratio: text("aspect_ratio"), // Generation aspect ratio
    model: text("model"), // AI model used
    generation_params: text("generation_params"), // JSON string
    generation_status:
      generationStatusEnum("generation_status").default("completed"), // Generation status
    cost: decimal("cost", { precision: 10, scale: 8 }), // Generation cost
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
      userId_idx: index("images_user_id_idx").on(table.user_id),
      status_idx: index("images_status_idx").on(table.status),
      createdAt_idx: index("images_created_at_idx").on(table.created_at),
      generationStatus_idx: index("images_generation_status_idx").on(
        table.generation_status,
      ),
      model_idx: index("images_model_idx").on(table.model),
    };
  },
);

// Shared images table for public gallery
export const SharedImagesSchema = pgTable(
  "shared_images",
  {
    id: text("id").primaryKey().notNull(),
    image_id: text("image_id")
      .references(() => ImagesSchema.id)
      .notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
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
      imageId_idx: index("shared_images_image_id_idx").on(table.image_id),
      userId_idx: index("shared_images_user_id_idx").on(table.user_id),
      status_idx: index("shared_images_status_idx").on(table.status),
      sharedAt_idx: index("shared_images_shared_at_idx").on(table.shared_at),
      likeCount_idx: index("shared_images_like_count_idx").on(table.like_count),
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
      .references(() => ImagesSchema.id)
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

// Export schemas
export const imageSchemas = {
  images: ImagesSchema,
  shared_images: SharedImagesSchema,
  image_likes: ImageLikesSchema,
};
