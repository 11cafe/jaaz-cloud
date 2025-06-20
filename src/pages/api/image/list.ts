/**
 * 用户项目列表API
 * 功能：获取当前用户创建的项目列表（分页）
 * 方法：GET
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ProjectsSchema, StepOutputsSchema } from "@/schema/project";
import { eq, desc } from "drizzle-orm";

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
    // 3. 解析查询参数
    const { page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string); // 当前页码（从1开始）
    const limitNum = parseInt(limit as string); // 每页显示数量
    const offset = (pageNum - 1) * limitNum; // 数据库查询偏移量

    // 4. 从数据库查询用户的项目列表（包含封面图像URL）
    const projects = await drizzleDb
      .select({
        id: ProjectsSchema.id, // 项目ID
        title: ProjectsSchema.title, // 项目标题
        description: ProjectsSchema.description, // 项目描述
        cover: ProjectsSchema.cover, // 封面输出ID
        status: ProjectsSchema.status, // 项目状态
        is_public: ProjectsSchema.is_public, // 是否公开
        view_count: ProjectsSchema.view_count, // 浏览次数
        like_count: ProjectsSchema.like_count, // 点赞次数
        total_cost: ProjectsSchema.total_cost, // 总成本
        created_at: ProjectsSchema.created_at, // 创建时间
        updated_at: ProjectsSchema.updated_at, // 更新时间
        cover_url: StepOutputsSchema.url, // 封面图像URL
      })
      .from(ProjectsSchema)
      .leftJoin(
        StepOutputsSchema,
        eq(ProjectsSchema.cover, StepOutputsSchema.id),
      ) // 左连接获取封面图像URL
      .where(eq(ProjectsSchema.user_id, session.user.id)) // 只查询当前用户的项目
      .orderBy(desc(ProjectsSchema.created_at)) // 按创建时间倒序排列
      .limit(limitNum) // 限制返回数量
      .offset(offset); // 设置偏移量

    // 5. 返回查询结果
    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        page: pageNum, // 当前页码
        limit: limitNum, // 每页数量
        hasMore: projects.length === limitNum, // 是否还有更多数据
      },
    });
  } catch (error) {
    // 6. 错误处理
    console.error("Get user projects error:", error);
    res.status(500).json({ error: "Failed to get projects" });
  }
}
