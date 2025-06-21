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
import { uploadImageToS3 } from "@/utils/s3Utils";
import { eq, and, desc } from "drizzle-orm";

// Set maximum duration for image generation (5 minutes)
export const maxDuration = 300;

// Configure API route to accept larger payloads for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Increase limit to 50MB for image data
    },
  },
};

// 项目生成请求的数据结构
interface GenerateProjectRequest {
  project_id?: string; // 可选：指定要添加步骤的项目ID
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
    // console.log(`Downloading image from URL: ${imageUrl}`);

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
 * 处理图像数据，上传到S3并返回相关信息
 */
async function processImageData(imageData: {
  imageUrl?: string;
  base64?: string;
  format: string;
  size: number;
}): Promise<{
  s3Url: string;
  base64: string;
  format: string;
  size: number;
}> {
  let base64Data: string;
  let format = imageData.format;
  let size = imageData.size;

  // 如果已经有base64数据，直接使用
  if (imageData.base64) {
    base64Data = imageData.base64;
  }
  // 如果只有URL，下载并转换为base64
  else if (imageData.imageUrl) {
    const downloadedData = await downloadImageAsBase64(imageData.imageUrl);
    base64Data = downloadedData.base64;
    format = downloadedData.format;
    size = downloadedData.size;
  } else {
    throw new Error("No image data or URL available");
  }

  // 上传到S3
  const s3Url = await uploadImageToS3(base64Data, format);

  return {
    s3Url,
    base64: base64Data,
    format,
    size,
  };
}

/**
 * 验证图像URL是否为有效的HTTP/HTTPS URL
 */
function isValidHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 验证图像URL是否为有效的base64 data URL
 */
function isValidBase64DataUrl(url: string): boolean {
  return url.startsWith("data:image/");
}

/**
 * 将HTTP URL图像转换为base64 data URL
 */
async function convertHttpUrlToBase64DataUrl(httpUrl: string): Promise<string> {
  try {
    const imageData = await downloadImageAsBase64(httpUrl);
    return `data:image/${imageData.format};base64,${imageData.base64}`;
  } catch (error) {
    throw new Error(
      `Failed to convert HTTP URL to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * 处理输入图像数组，将HTTP URL转换为base64 data URL
 */
async function processInputImages(inputImages: string[]): Promise<string[]> {
  const processedImages: string[] = [];

  for (let i = 0; i < inputImages.length; i++) {
    const imageUrl = inputImages[i];

    if (isValidBase64DataUrl(imageUrl)) {
      // 已经是base64 data URL，直接使用
      processedImages.push(imageUrl);
    } else if (isValidHttpUrl(imageUrl)) {
      // 是HTTP URL，转换为base64 data URL
      try {
        const base64DataUrl = await convertHttpUrlToBase64DataUrl(imageUrl);
        processedImages.push(base64DataUrl);
      } catch (error) {
        throw new Error(
          `Failed to process input image ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      throw new Error(
        `Input image ${i + 1} is not a valid image URL or data URL`,
      );
    }
  }

  return processedImages;
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
      project_id,
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

      // 验证每个图像是否为有效的 base64 data URL 或 HTTP URL
      for (let i = 0; i < input_images.length; i++) {
        const imageUrl = input_images[i];

        if (!isValidBase64DataUrl(imageUrl) && !isValidHttpUrl(imageUrl)) {
          return res.status(400).json({
            error: `Input image ${i + 1} is not a valid image data URL or HTTP URL`,
          });
        }

        // 如果是base64 data URL，检查数据大小
        if (isValidBase64DataUrl(imageUrl)) {
          const base64Data = imageUrl.split(",")[1];
          if (base64Data && base64Data.length > 7000000) {
            // 约5MB的base64
            return res.status(400).json({
              error: `Input image ${i + 1} is too large (max 5MB)`,
            });
          }
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
    const projectId = project_id || nanoid();
    const stepId = nanoid();

    // 7. 处理项目创建或复用
    let stepOrder = 1;

    if (project_id) {
      // 复用现有项目：验证项目存在且属于当前用户
      const existingProject = await drizzleDb
        .select()
        .from(ProjectsSchema)
        .where(
          and(
            eq(ProjectsSchema.id, project_id),
            eq(ProjectsSchema.user_id, session.user.id),
          ),
        )
        .limit(1);

      if (!existingProject.length) {
        return res
          .status(404)
          .json({ error: "Project not found or access denied" });
      }

      // 计算新步骤的顺序号
      const lastStep = await drizzleDb
        .select({ step_order: StepsSchema.step_order })
        .from(StepsSchema)
        .where(eq(StepsSchema.project_id, project_id))
        .orderBy(desc(StepsSchema.step_order))
        .limit(1);

      stepOrder = lastStep.length > 0 ? lastStep[0].step_order + 1 : 1;
    } else {
      // 创建新项目
      await drizzleDb.insert(ProjectsSchema).values({
        id: projectId,
        user_id: session.user.id,
        title: title,
        description: description,
        status: "active",
        is_public: false,
        total_cost: cost.toString(),
      });
    }

    // 8. 处理输入图像（将HTTP URL转换为base64 data URL）
    let processedInputImages = input_images;
    if (input_images && input_images.length > 0) {
      try {
        processedInputImages = await processInputImages(input_images);
      } catch (error) {
        return res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to process input images",
        });
      }
    }

    // 9. 创建步骤记录
    await drizzleDb.insert(StepsSchema).values({
      id: stepId,
      project_id: projectId,
      step_order: stepOrder,
      prompt: prompt,
      model: model,
      inputs: input_images, // 使用原始图像数组存入数据库
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

    // 10. 调用图像生成API
    console.log(
      `Calling image generation API for user: ${session.user.name} (ID: ${session.user.id}), model: ${model}`,
    );

    const generationParams: ImageGenerationParams = {
      prompt: prompt,
      model: model,
      aspectRatio: aspect_ratio,
      size: size,
      inputImages: processedInputImages, // 使用处理后的图像数组
      quality: quality,
      outputFormat: output_format,
      outputCompression: output_compression,
      background: background,
    };

    try {
      // 调用图像生成方法，添加超时控制
      const generationResponse = await Promise.race([
        generateImage(generationParams),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Image generation timeout after 300 seconds")),
            300000,
          ),
        ),
      ]);

      // 11. 检查生成是否成功
      if (
        generationResponse.status !== "succeeded" &&
        !generationResponse.output &&
        !generationResponse.data
      ) {
        throw new Error("Image generation failed");
      }

      // 12. 提取并处理图像数据
      const rawImageData = extractImageDataFromResponse(generationResponse);
      const processedImageData = await processImageData(rawImageData);
      const metadata = {
        format: processedImageData.format,
        size: processedImageData.size,
        s3_url: processedImageData.s3Url,
      };

      // 13. 创建输出记录
      const outputId = nanoid();
      await drizzleDb.insert(StepOutputsSchema).values({
        id: outputId,
        step_id: stepId,
        url: processedImageData.s3Url, // 使用S3 URL而不是base64
        type: "image",
        format: processedImageData.format,
        order: 0,
        metadata: metadata,
      });

      // 14. 更新步骤状态为完成
      await drizzleDb
        .update(StepsSchema)
        .set({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .where(eq(StepsSchema.id, stepId));

      // 15. 更新项目状态和封面（仅新项目需要）
      if (!project_id) {
        await drizzleDb
          .update(ProjectsSchema)
          .set({
            status: "completed",
            cover: processedImageData.s3Url, // 直接存储S3 URL作为封面
            updated_at: new Date().toISOString(),
          })
          .where(eq(ProjectsSchema.id, projectId));
      }

      // 16. 返回成功响应，图片存储到S3，返回base64 url，更快展示
      // const imgBase64Url = `data:image/${processedImageData.format};base64,${processedImageData.base64}`;
      //
      res.status(200).json({
        success: true,
        data: {
          project_id: projectId,
          step_id: stepId,
          output_id: outputId,
          image_url: processedImageData.s3Url,
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
    // 17. 错误处理
    console.error("Project generation error:", error);
    res.status(500).json({ error: "Failed to generate project" });
  }
}
