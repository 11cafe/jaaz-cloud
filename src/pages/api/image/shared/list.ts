/**
 * 公共分享图像列表API
 * 功能：获取所有用户分享到公共画廊的图像列表（分页）
 * 方法：GET
 * 认证：无需认证，公开访问
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ImagesSchema, SharedImagesSchema } from "@/schema/image";
import { UserSchema } from "@/schema/index";
import { eq, desc, and } from "drizzle-orm";

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

  try {
    // 2. 解析查询参数
    const { page = "1", limit = "20", featured = "false" } = req.query;
    const pageNum = parseInt(page as string); // 当前页码（从1开始）
    const limitNum = parseInt(limit as string); // 每页显示数量
    const offset = (pageNum - 1) * limitNum; // 数据库查询偏移量
    const showFeatured = featured === "true"; // 是否只显示精选图像

    // 3. 构建数据库查询
    // 使用JOIN查询关联三个表：分享表、图像表、用户表
    let query = drizzleDb
      .select({
        // 分享相关信息
        shareId: SharedImagesSchema.id, // 分享记录ID
        imageId: SharedImagesSchema.image_id, // 图像ID
        view_count: SharedImagesSchema.view_count, // 浏览次数
        like_count: SharedImagesSchema.like_count, // 点赞次数
        is_featured: SharedImagesSchema.is_featured, // 是否精选
        shared_at: SharedImagesSchema.shared_at, // 分享时间

        // 图像相关信息
        prompt: ImagesSchema.prompt, // 创作提示词
        image_data: ImagesSchema.image_data, // Base64图像数据
        image_format: ImagesSchema.image_format, // 图像格式
        aspect_ratio: ImagesSchema.aspect_ratio, // 图像宽高比
        model: ImagesSchema.model, // 使用的AI模型

        // 用户相关信息
        username: UserSchema.username, // 创作者用户名
      })
      .from(SharedImagesSchema)
      // 关联图像表，获取图像详细信息
      .innerJoin(ImagesSchema, eq(SharedImagesSchema.image_id, ImagesSchema.id))
      // 关联用户表，获取创作者信息
      .innerJoin(UserSchema, eq(SharedImagesSchema.user_id, UserSchema.id))
      // 只显示活跃状态的分享
      .where(eq(SharedImagesSchema.status, "active"));

    // 4. 如果指定只显示精选图像，添加过滤条件
    const whereConditions = showFeatured
      ? and(
          eq(SharedImagesSchema.status, "active"),
          eq(SharedImagesSchema.is_featured, true),
        )
      : eq(SharedImagesSchema.status, "active");

    // 更新查询条件
    query = drizzleDb
      .select({
        // 分享相关信息
        shareId: SharedImagesSchema.id, // 分享记录ID
        imageId: SharedImagesSchema.image_id, // 图像ID
        view_count: SharedImagesSchema.view_count, // 浏览次数
        like_count: SharedImagesSchema.like_count, // 点赞次数
        is_featured: SharedImagesSchema.is_featured, // 是否精选
        shared_at: SharedImagesSchema.shared_at, // 分享时间

        // 图像相关信息
        prompt: ImagesSchema.prompt, // 创作提示词
        image_data: ImagesSchema.image_data, // Base64图像数据
        image_format: ImagesSchema.image_format, // 图像格式
        aspect_ratio: ImagesSchema.aspect_ratio, // 图像宽高比
        model: ImagesSchema.model, // 使用的AI模型

        // 用户相关信息
        username: UserSchema.username, // 创作者用户名
      })
      .from(SharedImagesSchema)
      // 关联图像表，获取图像详细信息
      .innerJoin(ImagesSchema, eq(SharedImagesSchema.image_id, ImagesSchema.id))
      // 关联用户表，获取创作者信息
      .innerJoin(UserSchema, eq(SharedImagesSchema.user_id, UserSchema.id))
      // 应用条件过滤
      .where(whereConditions);

    // 5. 执行查询，按分享时间倒序排列
    const sharedImages = await query
      .orderBy(desc(SharedImagesSchema.shared_at)) // 最新分享的排在前面
      .limit(limitNum) // 限制返回数量
      .offset(offset); // 设置偏移量

    // 6. 返回查询结果
    res.status(200).json({
      success: true,
      data: sharedImages,
      pagination: {
        page: pageNum, // 当前页码
        limit: limitNum, // 每页数量
        hasMore: sharedImages.length === limitNum, // 是否还有更多数据
      },
    });
  } catch (error) {
    // 7. 错误处理
    console.error("Get shared images error:", error);
    res.status(500).json({ error: "Failed to get shared images" });
  }
}
