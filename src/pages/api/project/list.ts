/**
 * 用户项目列表API
 * 功能：获取当前用户创建的项目列表（分页，适配 ProjectSidebar）
 * 方法：GET
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ProjectsSchema } from "@/schema/project";
import { eq, desc, and, sql } from "drizzle-orm";

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
    // 3. 解析查询参数
    const { page = "1", limit = "20", status } = req.query;
    const pageNum = parseInt(page as string); // 当前页码（从1开始）
    const limitNum = parseInt(limit as string); // 每页显示数量
    const offset = (pageNum - 1) * limitNum; // 数据库查询偏移量

    // 4. 构建查询条件
    let whereCondition = eq(ProjectsSchema.user_id, userId);

    // 如果指定了状态筛选
    if (status && typeof status === "string") {
      whereCondition = and(
        whereCondition,
        eq(ProjectsSchema.status, status as any),
      );
    }

    // 5. 从数据库查询用户的项目列表
    const projects = await drizzleDb
      .select({
        id: ProjectsSchema.id, // 项目ID
        title: ProjectsSchema.title, // 项目标题
        description: ProjectsSchema.description, // 项目描述
        cover: ProjectsSchema.cover, // 封面图片URL
        featured: ProjectsSchema.featured, // 精选图片URL数组
        status: ProjectsSchema.status, // 项目状态
        is_public: ProjectsSchema.is_public, // 是否公开
        view_count: ProjectsSchema.view_count, // 浏览次数
        like_count: ProjectsSchema.like_count, // 点赞次数
        total_cost: ProjectsSchema.total_cost, // 总成本
        created_at: ProjectsSchema.created_at, // 创建时间
        updated_at: ProjectsSchema.updated_at, // 更新时间
      })
      .from(ProjectsSchema)
      .where(whereCondition) // 只查询当前用户的项目
      .orderBy(desc(ProjectsSchema.created_at)) // 按创建时间倒序排列
      .limit(limitNum) // 限制返回数量
      .offset(offset); // 设置偏移量

    // 6. 获取总数（用于分页信息）
    const totalCountResult = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(ProjectsSchema)
      .where(whereCondition);

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    // 7. 返回查询结果
    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        page: pageNum, // 当前页码
        limit: limitNum, // 每页数量
        total: totalCount, // 总数量
        totalPages, // 总页数
        hasMore: pageNum < totalPages, // 是否还有更多数据
      },
    });
  } catch (error) {
    // 8. 错误处理
    console.error("Get user projects error:", error);
    res.status(500).json({
      error: "Failed to get projects",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
