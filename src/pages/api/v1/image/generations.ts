import { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { serverConsume } from "@/utils/serverConsume";
import { TransactionType } from "@/schema";
import {
  checkUserBalance,
  createInsufficientBalanceResponse,
} from "@/utils/balanceCheck";
import { applyCors } from "@/utils/corsUtils";
import OpenAI from "openai";

// Allow longer responses for image generation
export const maxDuration = 120;

// Custom CORS config for image generation
const imageCorsConfig = {
  methods: ["POST", "OPTIONS"],
  origin: "*",
  credentials: false,
  optionsSuccessStatus: 200,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Image generation pricing by model
const IMAGE_MODEL_PRICING: Record<string, number> = {
  "google/imagen-4": 0.04,
  "google/imagen-4-ultra": 0.06,
  "black-forest-labs/flux-1.1-pro": 0.04,
  "black-forest-labs/flux-kontext-pro": 0.04,
  "black-forest-labs/flux-kontext-max": 0.08,
  "recraft-ai/recraft-v3": 0.04,
  "ideogram-ai/ideogram-v3-balanced": 0.06,
  "openai/gpt-image-1": 0.04,
};

// Function to handle OpenAI image generation
async function generateImageWithOpenAI(
  prompt: string,
  model: string,
  size?: string,
  quality?: string,
  outputFormat?: string,
  outputCompression?: number,
  background?: string,
  inputImages?: File[],
  mask?: File,
): Promise<any> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  const client = new OpenAI({
    apiKey: openaiApiKey,
  });

  // Remove the 'openai/' prefix from model name
  const cleanModel = model.replace("openai/", "");

  // Use user provided size or default to auto
  const imageSize = size || "auto";

  try {
    if (inputImages && inputImages.length > 0) {
      // Image editing mode
      const editParams: any = {
        model: cleanModel,
        image: inputImages.length === 1 ? inputImages[0] : inputImages,
        prompt: prompt,
      };

      // Add optional parameters
      if (size && size !== "auto") editParams.size = imageSize as any;
      if (quality) editParams.quality = quality;
      if (outputFormat) editParams.output_format = outputFormat;
      if (outputCompression !== undefined)
        editParams.output_compression = outputCompression;
      if (background) editParams.background = background;
      if (mask) editParams.mask = mask;

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
        prompt: prompt,
      };

      // Add optional parameters
      if (size && size !== "auto") generateParams.size = imageSize as any;
      if (quality) generateParams.quality = quality;
      if (outputFormat) generateParams.output_format = outputFormat;
      if (outputCompression !== undefined)
        generateParams.output_compression = outputCompression;
      if (background) generateParams.background = background;

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Apply CORS configuration
  const shouldContinue = await applyCors(req, res, imageCorsConfig);
  if (!shouldContinue) {
    return; // OPTIONS request was handled
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication using shared utility
  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return; // Response already sent by authenticateRequest
  }

  const { userId, username } = authResult;

  // Check user balance before proceeding
  const balanceCheck = await checkUserBalance(userId);
  if (balanceCheck.error) {
    return res.status(500).json({ error: balanceCheck.error });
  }

  if (!balanceCheck.hasBalance) {
    console.log(
      `Image generation request blocked for user: ${username} (ID: ${userId}) - Insufficient balance: $${balanceCheck.balance}`,
    );
    return res
      .status(402)
      .json(createInsufficientBalanceResponse(balanceCheck.balance));
  }

  try {
    // Parse the request body
    const {
      prompt,
      model,
      aspect_ratio,
      input_image,
      input_images,
      mask,
      size,
      quality,
      output_format,
      output_compression,
      background,
    } = req.body;

    // Validate required parameters
    if (!prompt || !model) {
      return res.status(400).json({
        error: "Missing required parameters: prompt and model are required",
      });
    }

    // Check if model is supported
    const modelCost = IMAGE_MODEL_PRICING[model];
    if (modelCost === undefined) {
      console.error(`Unsupported model: ${model}`);
      return res.status(400).json({
        error: `Unsupported model: ${model}. Supported models: ${Object.keys(IMAGE_MODEL_PRICING).join(", ")}`,
      });
    }

    // Log the request
    console.log(
      `Image generation request from user: ${username} (ID: ${userId}), model: ${model}, prompt: "${prompt.substring(0, 50)}..."`,
    );

    let responseData: any;
    const isOpenAIModel = model.startsWith("openai/");

    // Check if this is an OpenAI model
    if (isOpenAIModel) {
      // Prepare input images (support both single input_image and multiple input_images)
      const inputImageArray =
        input_images || (input_image ? [input_image] : undefined);

      // Handle OpenAI image generation
      responseData = await generateImageWithOpenAI(
        prompt,
        model,
        size,
        quality,
        output_format,
        output_compression,
        background,
        inputImageArray,
        mask,
      );
    } else {
      // Handle Replicate models
      const replicateApiKey = process.env.REPLICATE_API_KEY;

      if (!replicateApiKey) {
        console.error("REPLICATE_API_KEY is not set in environment variables");
        return res
          .status(500)
          .json({ error: "Replicate API key is not configured" });
      }

      // Prepare the Replicate API request
      const replicateUrl = `https://api.replicate.com/v1/models/${model}/predictions`;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${replicateApiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      };

      // Prepare input data
      const inputData: any = {
        prompt,
        aspect_ratio: aspect_ratio || "1:1",
      };

      // Add input image if provided (for image-to-image generation)
      // Support both single input_image and first image from input_images array
      const imageForReplicate =
        input_image || (input_images && input_images[0]);
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
        console.error(
          `Replicate error: ${replicateResponse.status} - ${replicateResponse.statusText}`,
        );
        const errorData = await replicateResponse.json();
        return res.status(replicateResponse.status).json(errorData);
      }

      // Parse and return the response
      responseData = await replicateResponse.json();

      // Forward response headers
      replicateResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
    }

    // Check if image generation was successful
    if (responseData.status === "succeeded" || responseData.output) {
      // Calculate cost based on model
      const cost = modelCost;

      // Record consumption for successful image generation
      const description = `type: image, model: ${model}, prompt: "${prompt.substring(0, 40)}${prompt.length > 40 ? "..." : ""}"`;

      serverConsume({
        userId,
        amount: cost,
        description,
        transactionType: TransactionType.CONSUME_IMAGE,
      }).catch((error) => {
        console.error(
          `Failed to record image generation consumption for user ${username} (${userId}):`,
          error,
        );
      });

      // Log successful generation with cost
      console.log(`Image generation completed for ${username} (${userId}):`, {
        id: responseData.id,
        status: responseData.status,
        model: model,
        cost: cost,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in image generation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
