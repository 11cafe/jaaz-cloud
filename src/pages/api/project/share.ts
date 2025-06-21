/**
 * 项目分享API
 * 功能：将用户的私有项目设置为公开分享，并更新标题、描述、封面
 * 方法：POST
 * 认证：需要用户登录，且只能分享自己的项目
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ProjectsSchema } from "@/schema/project";
import { eq, and } from "drizzle-orm";

// 分享项目请求的数据结构
interface ShareProjectRequest {
  projectId: string; // 要分享的项目ID（必填）
  title: string; // 项目标题（必填）
  description?: string; // 项目描述（可选）
  cover: string; // 封面图片URL（必填）
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
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 3. 解析请求参数
    const { projectId, title, description, cover } =
      req.body as ShareProjectRequest;

    // 4. 验证必填参数
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Project title is required" });
    }

    if (!cover) {
      return res.status(400).json({ error: "Cover image is required" });
    }

    // 5. 验证项目存在且属于当前用户
    const project = await drizzleDb
      .select({
        id: ProjectsSchema.id,
        status: ProjectsSchema.status,
        is_public: ProjectsSchema.is_public,
      })
      .from(ProjectsSchema)
      .where(
        and(
          eq(ProjectsSchema.id, projectId), // 匹配项目ID
          eq(ProjectsSchema.user_id, session.user.id), // 确保项目属于当前用户
        ),
      )
      .limit(1);

    // 6. 检查项目是否存在
    if (!project.length) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 7. 检查项目状态是否允许分享
    if (project[0].status === "deleted") {
      return res.status(400).json({ error: "Cannot share deleted project" });
    }

    // 8. 更新项目信息并设置为公开分享
    const updatedProject = await drizzleDb
      .update(ProjectsSchema)
      .set({
        title: title.trim(),
        description: description?.trim() || null,
        cover: cover,
        is_public: true,
        status: "shared", // 分享时更新状态
        updated_at: new Date().toISOString(),
      })
      .where(eq(ProjectsSchema.id, projectId))
      .returning();

    // 9. 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        projectId,
        title: updatedProject[0]?.title,
        description: updatedProject[0]?.description,
        cover: updatedProject[0]?.cover,
        is_public: true,
        status: updatedProject[0]?.status,
      },
      message: "Project shared successfully",
    });

    console.log(
      `Project ${projectId} shared by user ${session.user.id} with title: ${title}`,
    );
  } catch (error) {
    // 10. 错误处理
    console.error("Share project error:", error);
    res.status(500).json({ error: "Failed to share project" });
  }
}
