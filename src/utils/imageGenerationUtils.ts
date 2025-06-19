import OpenAI from "openai";

// Image generation parameters interface
export interface ImageGenerationParams {
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  outputFormat?: string;
  outputCompression?: number;
  background?: string;
  aspectRatio?: string;
  inputImages?: File[];
  mask?: File;
}

// Standardized response interface
export interface ImageGenerationResponse {
  status: "succeeded" | "failed";
  data?: any[];
  output?: any;
  id?: string;
  error?: string;
}

/**
 * Generate image using OpenAI API
 * 使用 OpenAI API 生成图像
 */
export async function generateImageWithOpenAI(
  params: ImageGenerationParams,
): Promise<ImageGenerationResponse> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  const client = new OpenAI({
    apiKey: openaiApiKey,
  });

  // Remove the 'openai/' prefix from model name
  const cleanModel = params.model.replace("openai/", "");

  // Use user provided size or default to auto
  const imageSize = params.size || "auto";

  try {
    if (params.inputImages && params.inputImages.length > 0) {
      // Image editing mode
      const editParams: any = {
        model: cleanModel,
        image:
          params.inputImages.length === 1
            ? params.inputImages[0]
            : params.inputImages,
        prompt: params.prompt,
      };

      // Add optional parameters
      if (params.size && params.size !== "auto")
        editParams.size = imageSize as any;
      if (params.quality) editParams.quality = params.quality;
      if (params.outputFormat) editParams.output_format = params.outputFormat;
      if (params.outputCompression !== undefined)
        editParams.output_compression = params.outputCompression;
      if (params.background) editParams.background = params.background;
      if (params.mask) editParams.mask = params.mask;

      const response = await client.images.edit(editParams);

      if (!response.data || !response.data[0]) {
        throw new Error("No image data received from OpenAI");
      }

      return {
        status: "succeeded",
        ...response,
      };
    } else {
      // Image generation mode
      const generateParams: any = {
        model: cleanModel,
        prompt: params.prompt,
      };

      // Add optional parameters
      if (params.size && params.size !== "auto")
        generateParams.size = imageSize as any;
      if (params.quality) generateParams.quality = params.quality;
      if (params.outputFormat)
        generateParams.output_format = params.outputFormat;
      if (params.outputCompression !== undefined)
        generateParams.output_compression = params.outputCompression;
      if (params.background) generateParams.background = params.background;

      const response = await client.images.generate(generateParams);

      if (!response.data || !response.data[0]) {
        throw new Error("No image data received from OpenAI");
      }

      return {
        status: "succeeded",
        ...response,
      };
    }
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    throw error;
  }
}

/**
 * Generate image using Replicate API
 * 使用 Replicate API 生成图像
 */
export async function generateImageWithReplicate(
  params: ImageGenerationParams,
): Promise<ImageGenerationResponse> {
  const replicateApiKey = process.env.REPLICATE_API_KEY;

  if (!replicateApiKey) {
    throw new Error("Replicate API key is not configured");
  }

  try {
    // Prepare the Replicate API request
    const replicateUrl = `https://api.replicate.com/v1/models/${params.model}/predictions`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${replicateApiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    };

    // Prepare input data
    const inputData: any = {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio || "1:1",
    };

    // Add input image if provided (for image-to-image generation)
    // Support both single input_image and first image from input_images array
    const imageForReplicate = params.inputImages && params.inputImages[0];
    if (imageForReplicate) {
      inputData.input_image = imageForReplicate;
    }

    const requestBody = {
      input: inputData,
    };

    // Forward request to Replicate
    const replicateResponse = await fetch(replicateUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    // Check if response is successful
    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json();
      console.error(
        `Replicate error: ${replicateResponse.status} - ${replicateResponse.statusText}`,
        errorData,
      );
      return {
        status: "failed",
        error: `Replicate API error: ${replicateResponse.status}`,
      };
    }

    // Parse and return the response
    const responseData = await replicateResponse.json();

    return {
      status: "succeeded",
      ...responseData,
    };
  } catch (error) {
    console.error("Replicate image generation error:", error);
    throw error;
  }
}

/**
 * Generate image using the appropriate service based on model
 * 根据模型选择合适的服务生成图像
 */
export async function generateImage(
  params: ImageGenerationParams,
): Promise<ImageGenerationResponse> {
  const isOpenAIModel = params.model.startsWith("openai/");

  if (isOpenAIModel) {
    return await generateImageWithOpenAI(params);
  } else {
    return await generateImageWithReplicate(params);
  }
}

// Image generation pricing by model
export const IMAGE_MODEL_PRICING: Record<string, number> = {
  "google/imagen-4": 0.04,
  "google/imagen-4-ultra": 0.06,
  "black-forest-labs/flux-1.1-pro": 0.04,
  "black-forest-labs/flux-kontext-pro": 0.04,
  "black-forest-labs/flux-kontext-max": 0.08,
  "recraft-ai/recraft-v3": 0.04,
  "ideogram-ai/ideogram-v3-balanced": 0.06,
  "openai/gpt-image-1": 0.04,
};

/**
 * Get model pricing
 * 获取模型定价
 */
export function getModelPricing(model: string): number {
  const cost = IMAGE_MODEL_PRICING[model];
  if (cost === undefined) {
    throw new Error(
      `Unsupported model: ${model}. Supported models: ${Object.keys(IMAGE_MODEL_PRICING).join(", ")}`,
    );
  }
  return cost;
}
