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
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { UserSchema } from "./index";

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "active",
  "completed",
  "shared",
  "deleted",
]);

// Asset type enum
export const assetTypeEnum = pgEnum("asset_type", [
  "image",
  "video",
  "audio",
  "text",
]);

// Step status enum
export const stepStatusEnum = pgEnum("step_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

// Projects table - main container for workflows
export const ProjectsSchema = pgTable(
  "projects",
  {
    id: text("id").primaryKey().notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    thumbnail_asset_id: text("thumbnail_asset_id"), // Reference to cover image
    status: projectStatusEnum("status").default("draft").notNull(),
    is_public: boolean("is_public").default(false).notNull(),
    view_count: integer("view_count").default(0).notNull(),
    like_count: integer("like_count").default(0).notNull(),
    total_cost: decimal("total_cost", { precision: 10, scale: 8 }).default("0"),
    metadata: jsonb("metadata"), // Additional project metadata
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userId_idx: index("projects_user_id_idx").on(table.user_id),
      status_idx: index("projects_status_idx").on(table.status),
      isPublic_idx: index("projects_is_public_idx").on(table.is_public),
      createdAt_idx: index("projects_created_at_idx").on(table.created_at),
      likeCount_idx: index("projects_like_count_idx").on(table.like_count),
    };
  },
);

// Assets table - stores all media files and content
export const AssetsSchema = pgTable(
  "assets",
  {
    id: text("id").primaryKey().notNull(),
    user_id: integer("user_id")
      .references(() => UserSchema.id)
      .notNull(),
    asset_type: assetTypeEnum("asset_type").notNull(),
    asset_format: text("asset_format").notNull(), // png, jpg, jpeg, webp, gif, mp4, mov, avi, mp3, wav, txt, json
    file_name: text("file_name").notNull(),
    file_size: integer("file_size"), // File size in bytes
    file_url: text("file_url"), // External storage URL
    file_data: text("file_data"), // Base64 encoded data (for small files)
    thumbnail_url: text("thumbnail_url"), // Thumbnail for videos/images
    duration: integer("duration"), // Duration for video/audio in seconds
    width: integer("width"), // Image/video width
    height: integer("height"), // Image/video height
    content: text("content"), // Text content for text assets
    metadata: jsonb("metadata"), // Additional asset metadata (EXIF, etc.)
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userId_idx: index("assets_user_id_idx").on(table.user_id),
      assetType_idx: index("assets_type_idx").on(table.asset_type),
      createdAt_idx: index("assets_created_at_idx").on(table.created_at),
    };
  },
);

// Steps table - represents individual operations in the workflow
export const StepsSchema = pgTable(
  "steps",
  {
    id: text("id").primaryKey().notNull(),
    project_id: text("project_id")
      .references(() => ProjectsSchema.id)
      .notNull(),
    step_order: integer("step_order").notNull(), // Order within the project
    prompt: text("prompt"), // Generation prompt
    model: text("model"), // AI model used
    parameters: jsonb("parameters"), // Generation parameters as JSON
    status: stepStatusEnum("status").default("pending").notNull(),
    cost: decimal("cost", { precision: 10, scale: 8 }), // Step cost
    execution_time: integer("execution_time"), // Execution time in seconds
    error_message: text("error_message"), // Error details if failed
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      projectId_idx: index("steps_project_id_idx").on(table.project_id),
      projectOrder_idx: index("steps_project_order_idx").on(
        table.project_id,
        table.step_order,
      ),
      status_idx: index("steps_status_idx").on(table.status),
      createdAt_idx: index("steps_created_at_idx").on(table.created_at),
    };
  },
);

// Step inputs - links steps to their input assets
export const StepInputsSchema = pgTable(
  "step_inputs",
  {
    id: text("id").primaryKey().notNull(),
    step_id: text("step_id")
      .references(() => StepsSchema.id, { onDelete: "cascade" })
      .notNull(),
    asset_id: text("asset_id")
      .references(() => AssetsSchema.id)
      .notNull(),
    order: integer("order").notNull().default(0), // Order of inputs
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      stepId_idx: index("step_inputs_step_id_idx").on(table.step_id),
      assetId_idx: index("step_inputs_asset_id_idx").on(table.asset_id),
      stepOrder_idx: index("step_inputs_step_order_idx").on(
        table.step_id,
        table.order,
      ),
      unique_step_asset: uniqueIndex("step_inputs_step_asset_unique").on(
        table.step_id,
        table.asset_id,
      ),
    };
  },
);

// Step outputs - links steps to their output assets
export const StepOutputsSchema = pgTable(
  "step_outputs",
  {
    id: text("id").primaryKey().notNull(),
    step_id: text("step_id")
      .references(() => StepsSchema.id, { onDelete: "cascade" })
      .notNull(),
    asset_id: text("asset_id")
      .references(() => AssetsSchema.id)
      .notNull(),
    order: integer("order").notNull().default(0), // Order of outputs
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      stepId_idx: index("step_outputs_step_id_idx").on(table.step_id),
      assetId_idx: index("step_outputs_asset_id_idx").on(table.asset_id),
      stepOrder_idx: index("step_outputs_step_order_idx").on(
        table.step_id,
        table.order,
      ),
      unique_step_asset: uniqueIndex("step_outputs_step_asset_unique").on(
        table.step_id,
        table.asset_id,
      ),
    };
  },
);

// Export schemas
export const projectSchemas = {
  projects: ProjectsSchema,
  assets: AssetsSchema,
  steps: StepsSchema,
  step_inputs: StepInputsSchema,
  step_outputs: StepOutputsSchema,
};
