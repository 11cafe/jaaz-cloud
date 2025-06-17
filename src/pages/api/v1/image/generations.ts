import { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { serverConsume } from "@/utils/serverConsume";
import { TransactionType } from "@/schema";
import {
  checkUserBalance,
  createInsufficientBalanceResponse,
} from "@/utils/balanceCheck";
import NextCors from "nextjs-cors";

// Allow longer responses for image generation
export const maxDuration = 120;

// Image generation pricing by model
const IMAGE_MODEL_PRICING: Record<string, number> = {
  "google/imagen-4": 0.04,
  "recraft-ai/recraft-v3": 0.04,
  "ideogram-ai/ideogram-v2-turbo": 0.05,
  "black-forest-labs/flux-1.1-pro": 0.04,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  await NextCors(req, res, {
    methods: ["POST", "OPTIONS"],
    origin: "*",
    credentials: false,
    optionsSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
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

  // Get Replicate API key from environment variables
  const replicateApiKey = process.env.REPLICATE_API_KEY;

  if (!replicateApiKey) {
    console.error("REPLICATE_API_KEY is not set in environment variables");
    return res
      .status(500)
      .json({ error: "Replicate API key is not configured" });
  }

  try {
    // Parse the request body
    const { prompt, model, aspect_ratio, input_image } = req.body;

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
    if (input_image) {
      inputData.input_image = input_image;
    }

    const requestBody = {
      input: inputData,
    };

    // Log the request
    console.log(
      `Image generation request from user: ${username} (ID: ${userId}), model: ${model}, prompt: "${prompt.substring(0, 50)}..."`,
    );

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
    const responseData = await replicateResponse.json();

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

    // Forward response headers
    replicateResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in image generation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
