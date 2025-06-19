/**
 * 公共分享图像列表API
 * 功能：获取所有用户分享到公共画廊的图像列表（分页）
 * 方法：GET
 * 认证：无需认证，公开访问（但会检查用户登录状态以显示点赞状态）
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import {
  ImagesSchema,
  SharedImagesSchema,
  ImageLikesSchema,
} from "@/schema/image";
import { UserSchema } from "@/schema/index";
import { eq, desc, and, asc, ilike, or } from "drizzle-orm";

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
    // 2. 检查用户登录状态（可选，用于显示点赞状态）
    const session = await getServerSession(req, res, authOptions);
    const currentUserId = session?.user?.id;

    // 3. 解析查询参数
    const {
      page = "1",
      limit = "20",
      featured = "false",
      model = "all",
      aspect_ratio = "all",
      sort_by = "latest",
      search = "",
    } = req.query;

    const pageNum = parseInt(page as string); // 当前页码（从1开始）
    const limitNum = parseInt(limit as string); // 每页显示数量
    const offset = (pageNum - 1) * limitNum; // 数据库查询偏移量
    const showFeatured = featured === "true"; // 是否只显示精选图像
    const selectedModel = model as string;
    const selectedAspectRatio = aspect_ratio as string;
    const sortBy = sort_by as string;
    const searchTerm = search as string;

    // 4. 构建WHERE条件
    let whereClause = eq(SharedImagesSchema.status, "active");

    // 精选过滤
    if (showFeatured) {
      whereClause = and(whereClause, eq(SharedImagesSchema.is_featured, true))!;
    }

    // 模型过滤
    if (selectedModel !== "all") {
      whereClause = and(whereClause, eq(ImagesSchema.model, selectedModel))!;
    }

    // 宽高比过滤
    if (selectedAspectRatio !== "all") {
      whereClause = and(
        whereClause,
        eq(ImagesSchema.aspect_ratio, selectedAspectRatio),
      )!;
    }

    // 搜索过滤
    if (searchTerm) {
      whereClause = and(
        whereClause,
        or(
          ilike(ImagesSchema.prompt, `%${searchTerm}%`),
          ilike(UserSchema.username, `%${searchTerm}%`),
        ),
      )!;
    }

    // 5. 构建排序
    let orderBy;
    switch (sortBy) {
      case "popular":
        orderBy = [
          desc(SharedImagesSchema.like_count),
          desc(SharedImagesSchema.shared_at),
        ];
        break;
      case "featured":
        orderBy = [
          desc(SharedImagesSchema.is_featured),
          desc(SharedImagesSchema.shared_at),
        ];
        break;
      case "latest":
      default:
        orderBy = [desc(SharedImagesSchema.shared_at)];
        break;
    }

    // 6. 根据是否有用户登录选择不同的查询方式
    let sharedImages;

    if (currentUserId) {
      // 用户已登录，包含点赞状态
      sharedImages = await drizzleDb
        .select({
          // 分享相关信息
          shareId: SharedImagesSchema.id,
          imageId: SharedImagesSchema.image_id,
          view_count: SharedImagesSchema.view_count,
          like_count: SharedImagesSchema.like_count,
          is_featured: SharedImagesSchema.is_featured,
          shared_at: SharedImagesSchema.shared_at,

          // 图像相关信息
          prompt: ImagesSchema.prompt,
          image_data: ImagesSchema.image_data,
          image_format: ImagesSchema.image_format,
          aspect_ratio: ImagesSchema.aspect_ratio,
          model: ImagesSchema.model,

          // 用户相关信息
          username: UserSchema.username,
          user_avatar: UserSchema.image_url,

          // 当前用户点赞状态
          is_liked_by_user: ImageLikesSchema.id,
        })
        .from(SharedImagesSchema)
        .innerJoin(
          ImagesSchema,
          eq(SharedImagesSchema.image_id, ImagesSchema.id),
        )
        .innerJoin(UserSchema, eq(SharedImagesSchema.user_id, UserSchema.id))
        .leftJoin(
          ImageLikesSchema,
          and(
            eq(ImageLikesSchema.image_id, SharedImagesSchema.id),
            eq(ImageLikesSchema.user_id, currentUserId),
          ),
        )
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limitNum + 1)
        .offset(offset);
    } else {
      // 用户未登录，不包含点赞状态
      sharedImages = await drizzleDb
        .select({
          // 分享相关信息
          shareId: SharedImagesSchema.id,
          imageId: SharedImagesSchema.image_id,
          view_count: SharedImagesSchema.view_count,
          like_count: SharedImagesSchema.like_count,
          is_featured: SharedImagesSchema.is_featured,
          shared_at: SharedImagesSchema.shared_at,

          // 图像相关信息
          prompt: ImagesSchema.prompt,
          image_data: ImagesSchema.image_data,
          image_format: ImagesSchema.image_format,
          aspect_ratio: ImagesSchema.aspect_ratio,
          model: ImagesSchema.model,

          // 用户相关信息
          username: UserSchema.username,
          user_avatar: UserSchema.image_url,
        })
        .from(SharedImagesSchema)
        .innerJoin(
          ImagesSchema,
          eq(SharedImagesSchema.image_id, ImagesSchema.id),
        )
        .innerJoin(UserSchema, eq(SharedImagesSchema.user_id, UserSchema.id))
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limitNum + 1)
        .offset(offset);
    }

    // 7. 处理分页信息和数据转换
    const hasMore = sharedImages.length > limitNum;
    const data = hasMore ? sharedImages.slice(0, limitNum) : sharedImages;

    // 转换数据格式，添加 is_liked 字段
    const formattedData = data.map((item) => ({
      shareId: item.shareId,
      imageId: item.imageId,
      view_count: item.view_count,
      like_count: item.like_count,
      is_featured: item.is_featured,
      shared_at: item.shared_at,
      prompt: item.prompt,
      image_data: item.image_data,
      image_format: item.image_format,
      aspect_ratio: item.aspect_ratio,
      model: item.model,
      username: item.username,
      user_avatar: item.user_avatar,
      is_liked: currentUserId ? !!(item as any).is_liked_by_user : false, // 用户登录时检查点赞状态
    }));

    // 10. 返回查询结果
    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        page: pageNum, // 当前页码
        limit: limitNum, // 每页数量
        hasMore: hasMore, // 是否还有更多数据
      },
    });
  } catch (error) {
    // 11. 错误处理
    console.error("Get shared images error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get shared images",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
