/**
 * 单个项目详情API
 * 功能：根据项目ID获取特定项目的完整信息（包含步骤和输出）
 * 方法：GET
 * 认证：需要用户登录，且只能访问自己的项目或公开的项目
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import {
  ProjectsSchema,
  StepsSchema,
  StepOutputsSchema,
} from "@/schema/project";
import { eq, and, or, inArray } from "drizzle-orm";

/**
 * API处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 1. 验证HTTP方法
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 2. 验证用户认证状态
  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return; // authenticateRequest already sent error response
  }

  const { userId } = authResult;

  try {
    // 3. 获取项目ID
    const { id: projectId } = req.query;

    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({
        error: "Project ID is required",
      });
    }

    // 4. 查询项目基本信息
    const projectResult = await drizzleDb
      .select({
        id: ProjectsSchema.id,
        user_id: ProjectsSchema.user_id,
        title: ProjectsSchema.title,
        description: ProjectsSchema.description,
        cover: ProjectsSchema.cover,
        featured: ProjectsSchema.featured,
        status: ProjectsSchema.status,
        is_public: ProjectsSchema.is_public,
        view_count: ProjectsSchema.view_count,
        like_count: ProjectsSchema.like_count,
        total_cost: ProjectsSchema.total_cost,
        metadata: ProjectsSchema.metadata,
        created_at: ProjectsSchema.created_at,
        updated_at: ProjectsSchema.updated_at,
      })
      .from(ProjectsSchema)
      .where(
        and(
          eq(ProjectsSchema.id, projectId),
          or(
            eq(ProjectsSchema.user_id, userId), // 用户自己的项目
            eq(ProjectsSchema.is_public, true), // 或者公开的项目
          ),
        ),
      );

    const project = projectResult[0];
    if (!project) {
      return res.status(404).json({
        error: "Project not found or access denied",
      });
    }

    // 5. 如果不是项目所有者，增加浏览次数
    if (project.user_id !== userId) {
      await drizzleDb
        .update(ProjectsSchema)
        .set({
          view_count: project.view_count + 1,
          updated_at: new Date().toISOString(),
        })
        .where(eq(ProjectsSchema.id, projectId));

      // 更新返回数据中的浏览次数
      project.view_count += 1;
    }

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
      .where(eq(StepsSchema.project_id, projectId))
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

    // 9. 返回完整的项目信息
    res.status(200).json({
      success: true,
      data: {
        ...project,
        steps: stepsWithOutputs,
      },
    });
  } catch (error) {
    // 10. 错误处理
    console.error("Get project details error:", error);
    res.status(500).json({
      error: "Failed to get project details",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
