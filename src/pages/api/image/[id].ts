/**
 * 单个图像详情API
 * 功能：根据图像ID获取特定图像的完整信息（包含Base64数据）
 * 方法：GET
 * 认证：需要用户登录，且只能访问自己的图像
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ImagesSchema } from "@/schema/image";
import { eq, and } from "drizzle-orm";

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
    // 3. 获取路径参数中的图像ID
    const { id } = req.query;

    // 4. 验证图像ID参数
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Image ID is required" });
    }

    // 5. 从数据库查询指定图像
    // 使用AND条件确保用户只能访问自己的图像
    const image = await drizzleDb
      .select() // 选择所有字段，包含完整的图像数据
      .from(ImagesSchema)
      .where(
        and(
          eq(ImagesSchema.id, id), // 匹配图像ID
          eq(ImagesSchema.user_id, session.user.id), // 确保图像属于当前用户
        ),
      )
      .limit(1); // 只需要一条记录

    // 6. 检查图像是否存在
    if (!image.length) {
      return res.status(404).json({ error: "Image not found" });
    }

    // 7. 返回图像完整信息
    res.status(200).json({
      success: true,
      data: image[0], // 返回图像的所有信息，包括Base64数据
    });
  } catch (error) {
    // 8. 错误处理
    console.error("Get image by ID error:", error);
    res.status(500).json({ error: "Failed to get image" });
  }
}
