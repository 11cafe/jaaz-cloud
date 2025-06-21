/**
 * 公开分享项目详情API
 * 功能：根据项目ID获取公开分享项目的完整信息（包含步骤和输出）
 * 方法：GET
 * 认证：无需认证，公开访问
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import {
  ProjectsSchema,
  StepsSchema,
  StepOutputsSchema,
} from "@/schema/project";
import { UserSchema } from "@/schema/index";
import { eq, and, inArray } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 1. 验证HTTP方法
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 2. 获取路径参数中的项目ID
    const { id } = req.query;

    // 3. 验证项目ID参数
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "Project ID is required",
      });
    }

    // 4. 查询公开分享的项目
    const project = await drizzleDb
      .select({
        // 项目相关信息
        id: ProjectsSchema.id,
        title: ProjectsSchema.title,
        description: ProjectsSchema.description,
        cover: ProjectsSchema.cover,
        featured: ProjectsSchema.featured,
        view_count: ProjectsSchema.view_count,
        like_count: ProjectsSchema.like_count,
        status: ProjectsSchema.status,
        created_at: ProjectsSchema.created_at,
        updated_at: ProjectsSchema.updated_at,

        // 用户相关信息
        username: UserSchema.username,
        user_avatar: UserSchema.image_url,
      })
      .from(ProjectsSchema)
      .innerJoin(UserSchema, eq(ProjectsSchema.user_id, UserSchema.id))
      .where(
        and(
          eq(ProjectsSchema.id, id),
          eq(ProjectsSchema.is_public, true),
          eq(ProjectsSchema.status, "shared"),
        ),
      )
      .limit(1);

    // 5. 检查项目是否存在
    if (!project.length) {
      return res.status(404).json({
        success: false,
        error: "Project not found or not publicly shared",
      });
    }

    const projectData = project[0];

    // 6. 查询项目的步骤信息
    const steps = await drizzleDb
      .select({
        id: StepsSchema.id,
        step_order: StepsSchema.step_order,
        prompt: StepsSchema.prompt,
        model: StepsSchema.model,
        inputs: StepsSchema.inputs,
        parameters: StepsSchema.parameters,
        status: StepsSchema.status,
        cost: StepsSchema.cost,
        error_message: StepsSchema.error_message,
        created_at: StepsSchema.created_at,
        updated_at: StepsSchema.updated_at,
      })
      .from(StepsSchema)
      .where(eq(StepsSchema.project_id, id))
      .orderBy(StepsSchema.step_order);

    // 7. 查询每个步骤的输出
    let outputs: any[] = [];
    if (steps.length > 0) {
      const stepIds = steps.map((step) => step.id);
      outputs = await drizzleDb
        .select({
          id: StepOutputsSchema.id,
          step_id: StepOutputsSchema.step_id,
          url: StepOutputsSchema.url,
          type: StepOutputsSchema.type,
          format: StepOutputsSchema.format,
          order: StepOutputsSchema.order,
          metadata: StepOutputsSchema.metadata,
          created_at: StepOutputsSchema.created_at,
        })
        .from(StepOutputsSchema)
        .where(inArray(StepOutputsSchema.step_id, stepIds))
        .orderBy(StepOutputsSchema.step_id, StepOutputsSchema.order);
    }

    // 8. 组织步骤和输出的关系
    const stepsWithOutputs = steps.map((step) => ({
      ...step,
      outputs: outputs.filter((output) => output.step_id === step.id),
    }));

    // 9. 增加浏览量（可选实现）
    // TODO: 实现浏览量统计
    // await drizzleDb
    //   .update(ProjectsSchema)
    //   .set({ view_count: projectData.view_count + 1 })
    //   .where(eq(ProjectsSchema.id, id));

    // 10. 返回完整的项目信息
    res.status(200).json({
      success: true,
      data: {
        ...projectData,
        steps: stepsWithOutputs,
        is_liked: false, // TODO: 实现用户点赞状态查询
      },
    });

    console.log(`Public project details requested: ${id}`);
  } catch (error) {
    // 11. 错误处理
    console.error("Get shared project details error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get project details",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
