/**
 * 创建项目API
 * 功能：创建一个新的空项目
 * 方法：POST
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ProjectsSchema } from "@/schema/project";
import { nanoid } from "nanoid";

// 创建项目请求的数据结构
interface CreateProjectRequest {
  title: string; // 项目标题（必填）
  description?: string; // 项目描述（可选）
}

/**
 * API处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 1. 验证HTTP方法
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 2. 验证用户认证状态
  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return; // authenticateRequest already sent error response
  }

  const { userId } = authResult;

  try {
    // 3. 解析请求参数
    const { title, description }: CreateProjectRequest = req.body;

    // 4. 验证必填字段
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        error: "Project title is required",
      });
    }

    // 5. 生成项目ID
    const projectId = nanoid();

    // 6. 创建项目记录
    const newProject = await drizzleDb
      .insert(ProjectsSchema)
      .values({
        id: projectId,
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        status: "draft", // 新项目默认为草稿状态
        is_public: false, // 默认为私有
        view_count: 0,
        like_count: 0,
        total_cost: "0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning({
        id: ProjectsSchema.id,
        title: ProjectsSchema.title,
        description: ProjectsSchema.description,
        status: ProjectsSchema.status,
        is_public: ProjectsSchema.is_public,
        view_count: ProjectsSchema.view_count,
        like_count: ProjectsSchema.like_count,
        total_cost: ProjectsSchema.total_cost,
        created_at: ProjectsSchema.created_at,
        updated_at: ProjectsSchema.updated_at,
      });

    // 7. 返回创建结果
    res.status(201).json({
      success: true,
      data: newProject[0],
      message: "Project created successfully",
    });
  } catch (error) {
    // 8. 错误处理
    console.error("Create project error:", error);
    res.status(500).json({
      error: "Failed to create project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
