/**
 * 项目点赞API
 * 功能：用户对公开项目进行点赞或取消点赞
 * 方法：POST
 * 认证：需要用户登录
 * 注意：点赞功能尚未完全实现，目前使用console.log代替
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ProjectsSchema } from "@/schema/project";
import { eq, and } from "drizzle-orm";

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
    // 3. 解析请求数据
    const { projectId } = req.body;

    // 4. 验证请求参数
    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({ error: "Project ID is required" });
    }

    // 5. 检查项目是否存在且为公开状态
    const project = await drizzleDb
      .select({
        id: ProjectsSchema.id,
        like_count: ProjectsSchema.like_count,
        status: ProjectsSchema.status,
        is_public: ProjectsSchema.is_public,
      })
      .from(ProjectsSchema)
      .where(
        and(
          eq(ProjectsSchema.id, projectId),
          eq(ProjectsSchema.is_public, true), // 只能对公开项目点赞
        ),
      )
      .limit(1);

    if (!project.length) {
      return res.status(404).json({ error: "Public project not found" });
    }

    // 6. TODO: 检查用户是否已经点赞过该项目
    // 这里需要创建一个project_likes表来记录用户点赞状态
    // 暂时用console.log代替实际的数据库操作
    console.log(
      `User ${session.user.id} attempting to like/unlike project ${projectId}`,
    );
    console.log("TODO: Check if user already liked this project");

    // 模拟点赞状态切换
    const isCurrentlyLiked = false; // TODO: 从数据库查询实际状态
    const newIsLiked = !isCurrentlyLiked;
    const currentLikeCount = project[0].like_count;
    const newLikeCount = newIsLiked
      ? currentLikeCount + 1
      : Math.max(0, currentLikeCount - 1);

    // 7. TODO: 实际的点赞/取消点赞操作
    if (newIsLiked) {
      console.log("TODO: Insert like record into project_likes table");
      // await drizzleDb.insert(ProjectLikesSchema).values({...});
    } else {
      console.log("TODO: Delete like record from project_likes table");
      // await drizzleDb.delete(ProjectLikesSchema).where(...);
    }

    // 8. 更新项目的点赞数
    console.log(
      `Updating project ${projectId} like count from ${currentLikeCount} to ${newLikeCount}`,
    );

    const updatedProject = await drizzleDb
      .update(ProjectsSchema)
      .set({
        like_count: newLikeCount,
        updated_at: new Date().toISOString(),
      })
      .where(eq(ProjectsSchema.id, projectId))
      .returning();

    // 9. 返回操作结果
    res.status(200).json({
      success: true,
      is_liked: newIsLiked,
      like_count: updatedProject[0]?.like_count || newLikeCount,
      message: newIsLiked
        ? "Project liked successfully"
        : "Project unliked successfully",
    });

    console.log(
      `Project ${projectId} ${newIsLiked ? "liked" : "unliked"} by user ${session.user.id}`,
    );
  } catch (error) {
    // 10. 错误处理
    console.error("Toggle project like error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle like",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
