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

/**
 * Step parameters 字段的结构
 */
export interface StepParameters {
  // 模型相关参数
  aspect_ratio?: string; // 宽高比
  quality?: string; // 质量设置
  seed?: number; // 随机种子
  [key: string]: any; // 其他模型参数
}

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "active",
  "completed",
  "shared",
  "deleted",
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
    cover: text("cover"), // StepOutput ID，作为项目封面
    featured: jsonb("featured"), // StepOutput ID 数组，精选内容
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
      // 分享页面优化索引
      publicShared_idx: index("projects_public_shared_idx").on(
        table.is_public,
        table.status,
      ),
      createdAt_idx: index("projects_created_at_idx").on(table.created_at),
      likeCount_idx: index("projects_like_count_idx").on(table.like_count),
      viewCount_idx: index("projects_view_count_idx").on(table.view_count),
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
    inputs: jsonb("inputs"), // 输入资源数组 (string[])
    parameters: jsonb("parameters"), // 其他生成参数
    status: stepStatusEnum("status").default("pending").notNull(),
    cost: decimal("cost", { precision: 10, scale: 8 }), // Step cost
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

// Step outputs - 直接存储输出资源信息
export const StepOutputsSchema = pgTable(
  "step_outputs",
  {
    id: text("id").primaryKey().notNull(),
    step_id: text("step_id")
      .references(() => StepsSchema.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(), // 资源URL
    type: text("type").notNull(), // image, video, audio, text
    format: text("format"), // png, jpg, mp4, etc.
    order: integer("order").notNull().default(0), // Order of outputs
    metadata: jsonb("metadata"), // 额外的元数据信息（尺寸、时长等）
    created_at: timestamp("created_at", { precision: 3, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      stepId_idx: index("step_outputs_step_id_idx").on(table.step_id),
      stepOrder_idx: index("step_outputs_step_order_idx").on(
        table.step_id,
        table.order,
      ),
      type_idx: index("step_outputs_type_idx").on(table.type),
    };
  },
);
