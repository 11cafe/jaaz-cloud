import OpenAI from "openai";
import { JAAZ_IMAGE_MODELS_INFO } from "../constants";

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
  inputImages?: File[] | string[];
  mask?: File | string;
}

// Standardized response interface
export interface ImageGenerationResponse {
  status: "succeeded" | "failed";
  data?: any[];
  output?: string[];
  id?: string;
  error?: string;
}

/**
 * Convert base64 data URL to File object for OpenAI API
 * 将base64数据URL转换为OpenAI API所需的File对象
 */
function convertBase64ToFile(
  base64DataUrl: string,
  filename: string = "image.png",
): File {
  // Extract the base64 data part after the comma
  const base64Data = base64DataUrl.split(",")[1];

  // Convert base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Determine MIME type from data URL
  const mimeMatch = base64DataUrl.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  // Create and return File object
  return new File([bytes], filename, { type: mimeType });
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

      // Convert input images from base64 data URLs to File objects
      let imageForEdit: File;
      if (typeof params.inputImages[0] === "string") {
        // If it's a base64 data URL, convert it to File
        if (params.inputImages[0].startsWith("data:image/")) {
          imageForEdit = convertBase64ToFile(
            params.inputImages[0],
            "input_image.png",
          );
        } else {
          throw new Error(
            "Input image must be a base64 data URL starting with 'data:image/'",
          );
        }
      } else if (params.inputImages[0] instanceof File) {
        // If it's already a File, use it directly
        imageForEdit = params.inputImages[0];
      } else {
        throw new Error(
          "Input image must be either a File object or a base64 data URL",
        );
      }

      const editParams: any = {
        model: cleanModel,
        image: imageForEdit,
        prompt: params.prompt,
      };

      // Handle mask if provided
      if (params.mask) {
        if (
          typeof params.mask === "string" &&
          params.mask.startsWith("data:image/")
        ) {
          editParams.mask = convertBase64ToFile(params.mask, "mask.png");
        } else if (params.mask instanceof File) {
          editParams.mask = params.mask;
        } else {
          editParams.mask = params.mask; // Assume it's already properly formatted
        }
      }

      // Add optional parameters
      if (params.size && params.size !== "auto")
        editParams.size = imageSize as any;
      if (params.quality) editParams.quality = params.quality;
      if (params.outputFormat) editParams.output_format = params.outputFormat;
      if (params.outputCompression !== undefined)
        editParams.output_compression = params.outputCompression;
      if (params.background) editParams.background = params.background;

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
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

export async function generateImageWithWavespeed(
  params: ImageGenerationParams,
): Promise<ImageGenerationResponse> {
  console.log("generateImageWithWavespeed params", params);
  const wavespeedApiKey = process.env.WAVESPEED_API_KEY;
  if (!wavespeedApiKey) {
    throw new Error("Wavespeed API key is not configured");
  }

  try {
    const submitResponse = await fetch(
      `https://api.wavespeed.ai/api/v3/${params.model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          images: params.inputImages,
          guidance_scale: 6.3,
          safety_tolerance: "2",
        }),
      },
    );
    console.log(submitResponse);

    if (submitResponse.status !== 200) {
      console.error("Wavespeed API error:", submitResponse.statusText);
      throw new Error(
        `Failed to submit task to Wavespeed API: ${submitResponse.statusText}`,
      );
    }

    const submitResult = await submitResponse.json();
    console.log(submitResult);
    // Assuming the task submission response has a request_id
    const requestId = submitResult.data?.id;

    if (!requestId) {
      throw new Error("Failed to get request_id from submission");
    }

    const finalResult = await wavespeedPollForResult(requestId);
    console.log("wavespeed finalResult", finalResult);

    return {
      status: "succeeded",
      output: [finalResult],
    };
  } catch (error) {
    console.error("Wavespeed image generation error:", error);
    throw error;
  }
}

async function wavespeedPollForResult(
  requestId: string,
  retries = 30,
  delay = 500,
) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
      },
    );
    console.log("polling response", response);

    if (response.status === 200) {
      const result = await response.json();
      console.log("polling result", result);
      // NOTE: The response structure is an assumption based on the polling logic.
      // You may need to adjust this based on the actual API response.
      if (!!result?.data?.outputs?.length) {
        return result.data.outputs[0];
      }
    }
    // Wait for a bit before the next poll.
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Polling timed out");
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
      input_image: params.inputImages?.[0],
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
  const isWavespeedModel = params.model.startsWith("wavespeed");

  console.log("generateImage params", params);

  if (isOpenAIModel) {
    return await generateImageWithOpenAI(params);
  } else if (isWavespeedModel) {
    return await generateImageWithWavespeed(params);
  } else {
    return await generateImageWithReplicate(params);
  }
}

/**
 * Get model pricing
 * 获取模型定价
 */
export function getModelPricing(model: string): number {
  const modelInfo = JAAZ_IMAGE_MODELS_INFO[model];
  if (!modelInfo) {
    throw new Error(
      `Unsupported model: ${model}. Supported models: ${Object.keys(JAAZ_IMAGE_MODELS_INFO).join(", ")}`,
    );
  }
  return modelInfo.price;
}
