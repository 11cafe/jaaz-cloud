import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import jwt from "jsonwebtoken";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { UserSchema } from "@/schema";
import { eq } from "drizzle-orm";

// Allow longer responses for image generation
export const maxDuration = 120;

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

// Helper function to verify JWT token and get user info
async function verifyTokenAndGetUser(token: string) {
  try {
    // Log token info for debugging (only first and last few characters for security)
    console.log(
      "Verifying token:",
      token.substring(0, 10) + "..." + token.substring(token.length - 10),
    );

    // Check if token looks like a valid JWT (should have 3 parts separated by dots)
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      console.error(
        "Invalid JWT format: token should have 3 parts separated by dots, got",
        tokenParts.length,
        "parts",
      );
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log("Token decoded successfully:", {
      id: decoded.id,
      email: decoded.email,
    });

    if (!decoded.id) {
      console.error("Token missing user ID");
      return null;
    }

    // Query user from database to get latest info
    const userRows = await drizzleDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, decoded.id));

    const user = userRows[0];
    if (!user) {
      console.error("User not found in database for ID:", decoded.id);
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("JWT verification failed:", error.message);
    } else {
      console.error("Token verification failed:", error);
    }
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authentication - support both session cookie and Bearer token
  const isDev = process.env.NODE_ENV === "development";
  let userId: number | null = null;
  let username = "anonymous";

  // First, try Bearer token authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim(); // Remove "Bearer " prefix and trim whitespace

    if (!token) {
      console.error("Empty token after Bearer prefix");
      return res.status(401).json({ error: "Empty token provided" });
    }

    console.log("Attempting Bearer token authentication");
    const user = await verifyTokenAndGetUser(token);

    if (user) {
      userId = user.id;
      username = user.username || user.email || "user";
      console.log(
        `Authenticated via Bearer token: ${username} (ID: ${userId})`,
      );
    } else {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } else {
    // Fallback to session cookie authentication
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
