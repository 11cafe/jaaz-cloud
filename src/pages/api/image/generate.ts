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
import {
  generateImage,
  getModelPricing,
  ImageGenerationParams,
  ImageGenerationResponse,
} from "@/utils/imageGenerationUtils";

// 图像生成请求的数据结构
interface GenerateImageRequest {
  prompt: string; // 创作提示词（必填）
  model?: string; // AI模型选择（可选，默认：openai/gpt-image-1）
  aspect_ratio?: string; // 图像宽高比（可选，默认：1:1）
  size?: string; // 图像尺寸（可选）
  quality?: string; // 图像质量（可选）
  input_images?: string[]; // 输入图像（可选）
  output_format?: string; // 输出格式（可选）
  output_compression?: number; // 压缩比（可选）
  background?: string; // 背景色（可选）
  generation_params?: any; // 其他生成参数（可选）
}

/**
 * 从生成响应中提取图像数据
 */
function extractImageDataFromResponse(responseData: ImageGenerationResponse): {
  imageUrl?: string;
  base64?: string;
  format: string;
  size: number;
} {
  // OpenAI 格式的响应
  if (responseData.data && responseData.data[0]) {
    const imageData = responseData.data[0];
    return {
      imageUrl: imageData.url,
      base64: imageData.b64_json,
      format: "png", // OpenAI 默认格式
      size: 0, // 无法准确获取，设为0
    };
  }

  // Replicate 格式的响应
  if (responseData.output) {
    // Replicate 通常返回图像URL
    const output = Array.isArray(responseData.output)
      ? responseData.output[0]
      : responseData.output;

    return {
      imageUrl: output,
      format: "png", // 默认格式
      size: 0, // 无法准确获取，设为0
    };
  }

  throw new Error("Unable to extract image data from response");
}

/**
 * 下载图像并转换为base64
 */
async function downloadImageAsBase64(imageUrl: string): Promise<{
  base64: string;
  format: string;
  size: number;
}> {
  try {
    console.log(`Downloading image from URL: ${imageUrl}`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 获取图像格式
    const contentType = response.headers.get("content-type") || "image/png";
    const format = contentType.split("/")[1] || "png";

    // 转换为base64
    const base64 = buffer.toString("base64");

    console.log(
      `Image downloaded successfully: ${buffer.length} bytes, format: ${format}`,
    );

    return {
      base64,
      format,
      size: buffer.length,
    };
  } catch (error) {
    console.error("Error downloading image:", error);
    throw new Error(
      `Failed to download image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * 处理图像数据，确保获得base64格式
 */
async function processImageData(imageData: {
  imageUrl?: string;
  base64?: string;
  format: string;
  size: number;
}): Promise<{
  base64: string;
  format: string;
  size: number;
}> {
  // 如果已经有base64数据，直接返回
  if (imageData.base64) {
    return {
      base64: imageData.base64,
      format: imageData.format,
      size: imageData.size,
    };
  }

  // 如果只有URL，下载并转换为base64
  if (imageData.imageUrl) {
    return await downloadImageAsBase64(imageData.imageUrl);
  }

  throw new Error("No image data or URL available");
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
      model = "openai/gpt-image-1", // 默认使用 OpenAI 模型
      aspect_ratio = "1:1",
      input_images = [],
      size,
      quality,
      output_format,
      output_compression,
      background,
      generation_params,
    } = req.body as GenerateImageRequest;

    // 4. 验证必填参数
    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 5. 验证模型是否支持并获取定价
    let cost: number;
    try {
      cost = getModelPricing(model);
    } catch (error) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : `Unsupported model: ${model}`,
      });
    }

    // 6. 调用共用的图像生成方法
    console.log(
      `Calling image generation API for user: ${session.user.name} (ID: ${session.user.id}), model: ${model}`,
    );

    const generationParams: ImageGenerationParams = {
      prompt: prompt,
      model: model,
      aspectRatio: aspect_ratio,
      size: size,
      inputImages: input_images,
      quality: quality,
      outputFormat: output_format,
      outputCompression: output_compression,
      background: background,
    };

    // 调用共用的图像生成方法
    const generationResponse = await generateImage(generationParams);

    // 7. 检查生成是否成功
    if (
      generationResponse.status !== "succeeded" &&
      !generationResponse.output &&
      !generationResponse.data
    ) {
      throw new Error("Image generation failed");
    }

    // 8. 提取图像数据
    const rawImageData = extractImageDataFromResponse(generationResponse);

    // 9. 处理图像数据，确保获得base64格式
    console.log(
      `Processing image data for user: ${session.user.name} (ID: ${session.user.id})`,
    );
    const processedImageData = await processImageData(rawImageData);

    // 10. 生成唯一图像ID
    const imageId = nanoid();

    // 11. 将图像数据存储到数据库（只存储base64格式）
    await drizzleDb.insert(ImagesSchema).values({
      id: imageId, // 唯一标识
      user_id: session.user.id, // 用户ID
      image_data: processedImageData.base64, // Base64编码的图像数据
      image_format: processedImageData.format, // 图像格式
      file_size: processedImageData.size, // 文件大小（字节）
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

    // 12. 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        id: imageId, // 图像ID，用于后续查询
        image_data: processedImageData.base64, // Base64图像数据，供前端直接显示
        cost, // 本次生成的成本
        file_size: processedImageData.size, // 文件大小
        format: processedImageData.format, // 图像格式
      },
    });

    console.log(
      `Image generation completed for user: ${session.user.name} (ID: ${session.user.id}), cost: $${cost}`,
    );
  } catch (error) {
    // 13. 错误处理
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
}
