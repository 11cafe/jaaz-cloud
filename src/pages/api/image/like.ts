/**
 * 图像点赞API
 * 功能：用户对分享的图像进行点赞或取消点赞
 * 方法：POST
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ImageLikesSchema, SharedImagesSchema } from "@/schema/image";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

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
    const { imageId } = req.body;

    // 4. 验证请求参数
    if (!imageId || typeof imageId !== "string") {
      return res.status(400).json({ error: "Image ID is required" });
    }

    // 5. 检查图像是否存在于分享表中
    const sharedImage = await drizzleDb
      .select()
      .from(SharedImagesSchema)
      .where(
        and(
          eq(SharedImagesSchema.id, imageId),
          eq(SharedImagesSchema.status, "active"),
        ),
      )
      .limit(1);

    if (!sharedImage.length) {
      return res.status(404).json({ error: "Shared image not found" });
    }

    // 6. 检查用户是否已经点赞过该图像
    const existingLike = await drizzleDb
      .select()
      .from(ImageLikesSchema)
      .where(
        and(
          eq(ImageLikesSchema.user_id, session.user.id),
          eq(ImageLikesSchema.image_id, imageId),
        ),
      )
      .limit(1);

    let isLiked: boolean;
    let newLikeCount: number;

    if (existingLike.length > 0) {
      // 7a. 用户已点赞，执行取消点赞操作
      await drizzleDb
        .delete(ImageLikesSchema)
        .where(
          and(
            eq(ImageLikesSchema.user_id, session.user.id),
            eq(ImageLikesSchema.image_id, imageId),
          ),
        );

      // 减少分享图像的点赞数
      const updatedImage = await drizzleDb
        .update(SharedImagesSchema)
        .set({
          like_count: Math.max(0, sharedImage[0].like_count - 1), // 确保不会小于0
          updated_at: new Date().toISOString(),
        })
        .where(eq(SharedImagesSchema.id, imageId))
        .returning();

      isLiked = false;
      newLikeCount = updatedImage[0]?.like_count || 0;
    } else {
      // 7b. 用户未点赞，执行点赞操作
      await drizzleDb.insert(ImageLikesSchema).values({
        id: nanoid(),
        user_id: session.user.id,
        image_id: imageId,
        created_at: new Date().toISOString(),
      });

      // 增加分享图像的点赞数
      const updatedImage = await drizzleDb
        .update(SharedImagesSchema)
        .set({
          like_count: sharedImage[0].like_count + 1,
          updated_at: new Date().toISOString(),
        })
        .where(eq(SharedImagesSchema.id, imageId))
        .returning();

      isLiked = true;
      newLikeCount = updatedImage[0]?.like_count || 0;
    }

    // 8. 返回操作结果
    res.status(200).json({
      success: true,
      is_liked: isLiked,
      like_count: newLikeCount,
      message: isLiked
        ? "Image liked successfully"
        : "Image unliked successfully",
    });
  } catch (error) {
    // 9. 错误处理
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle like",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
