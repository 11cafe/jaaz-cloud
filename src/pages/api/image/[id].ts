/**
 * 单个项目详情API
 * 功能：根据项目ID获取特定项目的完整信息（包含步骤和输出）
 * 方法：GET
 * 认证：需要用户登录，且只能访问自己的项目
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import {
  ProjectsSchema,
  StepsSchema,
  StepOutputsSchema,
} from "@/schema/project";
import { eq, and } from "drizzle-orm";

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
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 3. 获取路径参数中的项目ID
    const { id } = req.query;

    // 4. 验证项目ID参数
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // 5. 从数据库查询指定项目
    const project = await drizzleDb
      .select()
      .from(ProjectsSchema)
      .where(
        and(
          eq(ProjectsSchema.id, id), // 匹配项目ID
          eq(ProjectsSchema.user_id, session.user.id), // 确保项目属于当前用户
        ),
      )
      .limit(1);

    // 6. 检查项目是否存在
    if (!project.length) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 7. 查询项目的所有步骤
    const steps = await drizzleDb
      .select()
      .from(StepsSchema)
      .where(eq(StepsSchema.project_id, id))
      .orderBy(StepsSchema.step_order);

    // 8. 查询所有步骤的输出
    const stepIds = steps.map((step) => step.id);
    let outputs: any[] = [];

    if (stepIds.length > 0) {
      // 查询所有步骤的输出，而不只是第一个
      outputs = await drizzleDb
        .select()
        .from(StepOutputsSchema)
        .where(
          stepIds.length === 1
            ? eq(StepOutputsSchema.step_id, stepIds[0])
            : eq(StepOutputsSchema.step_id, stepIds[0]), // TODO: 支持多步骤查询
        )
        .orderBy(StepOutputsSchema.order);
    }

    // 9. 组合数据结构
    const projectData = {
      ...project[0],
      steps: steps.map((step) => ({
        ...step,
        outputs: outputs.filter((output) => output.step_id === step.id),
      })),
    };

    // 10. 返回项目完整信息
    res.status(200).json({
      success: true,
      data: projectData,
    });
  } catch (error) {
    // 11. 错误处理
    console.error("Get project by ID error:", error);
    res.status(500).json({ error: "Failed to get project" });
  }
}
