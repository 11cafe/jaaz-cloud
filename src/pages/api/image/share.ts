/**
 * 图像分享API
 * 功能：将用户的私有图像分享到公共画廊
 * 方法：POST
 * 认证：需要用户登录，且只能分享自己的图像
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ImagesSchema, SharedImagesSchema } from "@/schema/image";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// 分享图像请求的数据结构
interface ShareImageRequest {
  imageId: string; // 要分享的图像ID（必填）
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
    const { imageId } = req.body as ShareImageRequest;

    // 4. 验证必填参数
    if (!imageId) {
      return res.status(400).json({ error: "Image ID is required" });
    }

    // 5. 验证图像存在且属于当前用户
    const image = await drizzleDb
      .select({ id: ImagesSchema.id }) // 只需要确认图像存在即可
      .from(ImagesSchema)
      .where(
        and(
          eq(ImagesSchema.id, imageId), // 匹配图像ID
          eq(ImagesSchema.user_id, session.user.id), // 确保图像属于当前用户
          eq(ImagesSchema.status, "active"), // 确保图像状态为活跃
        ),
      )
      .limit(1);

    // 6. 检查图像是否存在
    if (!image.length) {
      return res.status(404).json({ error: "Image not found" });
    }

    // 7. 检查是否已经分享过
    // 防止重复分享同一张图像
    const existingShare = await drizzleDb
      .select({ id: SharedImagesSchema.id })
      .from(SharedImagesSchema)
      .where(
        and(
          eq(SharedImagesSchema.image_id, imageId), // 匹配图像ID
          eq(SharedImagesSchema.status, "active"), // 确保分享记录为活跃状态
        ),
      )
      .limit(1);

    // 8. 如果已经分享过，返回冲突错误
    if (existingShare.length) {
      return res.status(409).json({ error: "Image already shared" });
    }

    // 9. 生成分享记录的唯一ID
    const shareId = nanoid();

    // 10. 创建分享记录
    await drizzleDb.insert(SharedImagesSchema).values({
      id: shareId, // 分享记录ID
      image_id: imageId, // 关联的图像ID
      user_id: session.user.id, // 分享者用户ID
      view_count: 0, // 初始浏览次数
      like_count: 0, // 初始点赞次数
      is_featured: false, // 是否为精选（默认否）
      status: "active", // 分享状态（活跃）
    });

    // 11. 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        shareId, // 分享记录ID
        imageId, // 图像ID
      },
    });
  } catch (error) {
    // 12. 错误处理
    console.error("Share image error:", error);
    res.status(500).json({ error: "Failed to share image" });
  }
}
