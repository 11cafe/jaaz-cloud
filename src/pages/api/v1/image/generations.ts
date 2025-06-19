import { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { serverConsume } from "@/utils/serverConsume";
import { TransactionType } from "@/schema";
import {
  checkUserBalance,
  createInsufficientBalanceResponse,
} from "@/utils/balanceCheck";
import { applyCors } from "@/utils/corsUtils";
import {
  generateImage,
  getModelPricing,
  ImageGenerationParams,
} from "@/utils/imageGenerationUtils";

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

    // Check if model is supported and get pricing
    let modelCost: number;
    try {
      modelCost = getModelPricing(model);
    } catch (error) {
      console.error(`Unsupported model: ${model}`);
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : `Unsupported model: ${model}`,
      });
    }

    // Log the request
    console.log(
      `Image generation request from user: ${username} (ID: ${userId}), model: ${model}, prompt: "${prompt.substring(0, 50)}..."`,
    );

    // Prepare generation parameters
    const generationParams: ImageGenerationParams = {
      prompt,
      model,
      size,
      quality,
      outputFormat: output_format,
      outputCompression: output_compression,
      background,
      aspectRatio: aspect_ratio,
      inputImages: input_images || (input_image ? [input_image] : undefined),
      mask,
    };

    // Generate image using the appropriate service
    const responseData = await generateImage(generationParams);

    // Check if image generation was successful
    if (responseData.status === "succeeded" || responseData.output) {
      // Record consumption for successful image generation
      const description = `type: image, model: ${model}, prompt: "${prompt.substring(0, 40)}${prompt.length > 40 ? "..." : ""}"`;

      serverConsume({
        userId,
        amount: modelCost,
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
        cost: modelCost,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in image generation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
