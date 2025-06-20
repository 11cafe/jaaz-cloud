/**
 * 项目生成API
 * 功能：接收用户的创作提示词，生成AI项目并存储到数据库
 * 方法：POST
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import {
  ProjectsSchema,
  StepsSchema,
  StepOutputsSchema,
} from "@/schema/project";
import { nanoid } from "nanoid";
import {
  generateImage,
  getModelPricing,
  ImageGenerationParams,
  ImageGenerationResponse,
} from "@/utils/imageGenerationUtils";
import { eq } from "drizzle-orm";

// 项目生成请求的数据结构
interface GenerateProjectRequest {
  title?: string; // 项目标题（可选）
  description?: string; // 项目描述（可选）
  prompt: string; // 创作提示词（必填）
  model?: string; // AI模型选择（可选）
  aspect_ratio?: string; // 图像宽高比（可选）
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
      title = "AI生成项目",
      description,
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
    } = req.body as GenerateProjectRequest;

    // 4. 验证必填参数
    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 4.1 验证输入图像
    if (input_images && input_images.length > 0) {
      // 数量限制
      if (input_images.length > 5) {
        return res
          .status(400)
          .json({ error: "Maximum 5 input images allowed" });
      }

      // 验证每个图像是否为有效的 base64 data URL
      for (let i = 0; i < input_images.length; i++) {
        const imageUrl = input_images[i];
        if (!imageUrl.startsWith("data:image/")) {
          return res.status(400).json({
            error: `Input image ${i + 1} is not a valid image data URL`,
          });
        }

        // 检查base64数据大小（约估算，base64比原始数据大约33%）
        const base64Data = imageUrl.split(",")[1];
        if (base64Data && base64Data.length > 7000000) {
          // 约5MB的base64
          return res.status(400).json({
            error: `Input image ${i + 1} is too large (max 5MB)`,
          });
        }
      }

      // 验证模型是否支持输入图像
      if (!model.includes("flux-kontext") && !model.includes("gpt")) {
        return res.status(400).json({
          error:
            "Selected model does not support input images. Please use Flux-Kontext or GPT models.",
        });
      }
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

    // 6. 生成项目ID和步骤ID
    const projectId = nanoid();
    const stepId = nanoid();

    // 7. 创建项目记录
    await drizzleDb.insert(ProjectsSchema).values({
      id: projectId,
      user_id: session.user.id,
      title: title,
      description: description,
      status: "active",
      is_public: false,
      total_cost: cost.toString(),
    });

    // 8. 创建步骤记录
    await drizzleDb.insert(StepsSchema).values({
      id: stepId,
      project_id: projectId,
      step_order: 1,
      prompt: prompt,
      model: model,
      inputs: input_images,
      parameters: {
        aspect_ratio,
        size,
        quality,
        output_format,
        output_compression,
        background,
        ...generation_params,
      },
      status: "running",
      cost: cost.toString(),
    });

    // 9. 调用图像生成API
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

    try {
      // 调用图像生成方法
      const generationResponse = await generateImage(generationParams);

      // 10. 检查生成是否成功
      if (
        generationResponse.status !== "succeeded" &&
        !generationResponse.output &&
        !generationResponse.data
      ) {
        throw new Error("Image generation failed");
      }

      // 11. 提取并处理图像数据
      const rawImageData = extractImageDataFromResponse(generationResponse);
      const processedImageData = await processImageData(rawImageData);
      const imageUrl = `data:image/${processedImageData.format};base64,${processedImageData.base64}`;
      const metadata = {
        format: processedImageData.format,
        size: processedImageData.size,
      };

      // 12. 创建输出记录
      const outputId = nanoid();
      await drizzleDb.insert(StepOutputsSchema).values({
        id: outputId,
        step_id: stepId,
        url: imageUrl,
        type: "image",
        format: rawImageData.format,
        order: 0,
        metadata: metadata,
      });

      // 13. 更新步骤状态为完成
      await drizzleDb
        .update(StepsSchema)
        .set({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .where(eq(StepsSchema.id, stepId));

      // 14. 更新项目状态和封面
      await drizzleDb
        .update(ProjectsSchema)
        .set({
          status: "completed",
          cover: imageUrl, // 直接存储图片URL作为封面
          updated_at: new Date().toISOString(),
        })
        .where(eq(ProjectsSchema.id, projectId));

      // 15. 返回成功响应
      res.status(200).json({
        success: true,
        data: {
          project_id: projectId,
          step_id: stepId,
          output_id: outputId,
          image_url: imageUrl,
          cost: cost,
          metadata: metadata,
        },
      });

      console.log(
        `Project generation completed for user: ${session.user.name} (ID: ${session.user.id}), cost: $${cost}`,
      );
    } catch (generationError) {
      // 如果生成失败，更新步骤状态
      await drizzleDb
        .update(StepsSchema)
        .set({
          status: "failed",
          error_message:
            generationError instanceof Error
              ? generationError.message
              : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .where(eq(StepsSchema.id, stepId));

      throw generationError;
    }
  } catch (error) {
    // 16. 错误处理
    console.error("Project generation error:", error);
    res.status(500).json({ error: "Failed to generate project" });
  }
}
