/**
 * 用户图像列表API
 * 功能：获取当前用户生成的图像列表（分页）
 * 方法：GET
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ImagesSchema } from "@/schema/image";
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

    // 4. 从数据库查询用户的图像列表
    // 注意：这里不返回完整的image_data，只返回元数据，提高查询性能
    const images = await drizzleDb
      .select({
        id: ImagesSchema.id, // 图像ID
        prompt: ImagesSchema.prompt, // 创作提示词
        aspect_ratio: ImagesSchema.aspect_ratio, // 图像宽高比
        model: ImagesSchema.model, // 使用的AI模型
        generation_status: ImagesSchema.generation_status, // 生成状态
        cost: ImagesSchema.cost, // 生成成本
        created_at: ImagesSchema.created_at, // 创建时间
      })
      .from(ImagesSchema)
      .where(eq(ImagesSchema.user_id, session.user.id)) // 只查询当前用户的图像
      .orderBy(desc(ImagesSchema.created_at)) // 按创建时间倒序排列
      .limit(limitNum) // 限制返回数量
      .offset(offset); // 设置偏移量

    // 5. 返回查询结果
    res.status(200).json({
      success: true,
      data: images,
      pagination: {
        page: pageNum, // 当前页码
        limit: limitNum, // 每页数量
        hasMore: images.length === limitNum, // 是否还有更多数据
      },
    });
  } catch (error) {
    // 6. 错误处理
    console.error("Get user images error:", error);
    res.status(500).json({ error: "Failed to get images" });
  }
}
