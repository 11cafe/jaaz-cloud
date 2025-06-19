/**
 * 图像生成API
 * 功能：接收用户的创作提示词，生成AI图像并存储到数据库
 * 方法：POST
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { ImagesSchema } from "@/schema/image";
import { nanoid } from "nanoid";

// 图像生成请求的数据结构
interface GenerateImageRequest {
  prompt: string; // 创作提示词（必填）
  model?: string; // AI模型选择（可选，默认：dall-e-3）
  aspect_ratio?: string; // 图像宽高比（可选，默认：1:1）
  generation_params?: any; // 其他生成参数（可选）
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
    const {
      prompt,
      model = "dall-e-3",
      aspect_ratio = "1:1",
      generation_params,
    } = req.body as GenerateImageRequest;

    // 4. 验证必填参数
    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 5. 生成AI图像
    // TODO: 这里需要集成真实的AI图像生成服务（如OpenAI DALL-E、Midjourney等）
    // 目前使用占位图像进行演示
    const placeholderImage = await generatePlaceholderImage();

    // 6. 生成唯一图像ID
    const imageId = nanoid();

    // 7. 计算生成成本
    const cost = calculateCost(model, aspect_ratio);

    // 8. 将图像数据存储到数据库
    await drizzleDb.insert(ImagesSchema).values({
      id: imageId, // 唯一标识
      user_id: session.user.id, // 用户ID
      image_data: placeholderImage.base64, // Base64编码的图像数据
      image_format: placeholderImage.format, // 图像格式（png/jpg/webp）
      file_size: placeholderImage.size, // 文件大小（字节）
      prompt, // 创作提示词
      aspect_ratio: aspect_ratio as any, // 图像宽高比
      model: model as any, // 使用的AI模型
      generation_params: generation_params
        ? JSON.stringify(generation_params)
        : null, // 生成参数（JSON字符串）
      generation_status: "completed", // 生成状态
      cost: cost.toString(), // 生成成本
      status: "active", // 图像状态
    });

    // 9. 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        id: imageId, // 图像ID，用于后续查询
        image_data: placeholderImage.base64, // Base64图像数据，供前端直接显示
        cost, // 本次生成的成本
      },
    });
  } catch (error) {
    // 10. 错误处理
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
}

/**
 * 生成占位图像（临时函数）
 * 实际项目中应该替换为真实的AI图像生成逻辑
 *
 * @returns Promise<{base64: string, format: string, size: number}>
 */
async function generatePlaceholderImage() {
  // 生成1x1像素的透明PNG作为占位符
  // 这个Base64字符串代表一个透明的1x1像素PNG图像
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

  return {
    base64, // Base64编码的图像数据
    format: "png", // 图像格式
    size: 95, // 文件大小（字节）
  };
}

/**
 * 计算图像生成成本
 * 根据不同的AI模型和图像规格计算费用
 *
 * @param model - AI模型名称
 * @param aspectRatio - 图像宽高比
 * @returns number - 生成成本（美元）
 */
function calculateCost(model: string, aspectRatio: string): number {
  // 不同模型的基础价格（美元）
  const baseCosts: Record<string, number> = {
    "dall-e-3": 0.04, // DALL-E 3
    "dall-e-2": 0.02, // DALL-E 2
    midjourney: 0.03, // Midjourney
    "stable-diffusion": 0.01, // Stable Diffusion
  };

  // 返回对应模型的价格，如果模型不存在则使用默认价格
  return baseCosts[model] || 0.02;
}
