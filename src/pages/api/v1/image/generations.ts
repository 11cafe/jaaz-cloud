import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

// Allow longer responses for image generation
export const maxDuration = 120;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication - allow dev session or real user session
  const isDev = process.env.NODE_ENV === "development";
  let userId: number | null = null;
  let username = "anonymous";

  if (isDev) {
    // In development, create a mock dev session if no real session exists
    try {
      const session = await getServerSession(req, res, authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
        username = session.user.username || session.user.email || "user";
      } else {
        // Mock dev user
        userId = 999999;
        username = "dev-user";
        console.log("Using mock dev session for image generation");
      }
    } catch (error) {
      // Fallback to mock dev user if session check fails
      userId = 999999;
      username = "dev-user";
      console.log(
        "Session check failed, using mock dev session for image generation",
      );
    }
  } else {
    // In production, require real authentication
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }
      userId = session.user.id;
      username = session.user.username || session.user.email || "user";
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(401).json({ error: "Authentication failed" });
    }
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

    // Log successful generation
    console.log(`Image generation completed for ${username} (${userId}):`, {
      id: responseData.id,
      status: responseData.status,
      timestamp: new Date().toISOString(),
    });

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
