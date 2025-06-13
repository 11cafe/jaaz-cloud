import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import jwt from "jsonwebtoken";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { UserSchema } from "@/schema";
import { eq } from "drizzle-orm";

// Allow streaming responses up to 90 seconds
export const maxDuration = 90;

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
          userId = 999999; // Mock dev user ID
          username = "dev-user";
          console.log("Using mock dev session for testing");
        }
      } catch (error) {
        // Fallback to mock dev user if session check fails
        userId = 999999;
        username = "dev-user";
        console.log("Session check failed, using mock dev session");
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

  // Get OpenRouter API key from environment variables
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterApiKey) {
    console.error("OPENROUTER_API_KEY is not set in environment variables");
    return res
      .status(500)
      .json({ error: "OpenRouter API key is not configured" });
  }

  try {
    // Parse the request body to add usage tracking
    const requestBody = req.body;

    // Add usage tracking to the request
    const modifiedBody = {
      ...requestBody,
      usage: {
        include: true,
      },
    };

    // Prepare headers for OpenRouter
    const headers: Record<string, string> = {
      Authorization: `Bearer ${openrouterApiKey}`,
      "Content-Type": "application/json",
    };

    // Add optional headers for OpenRouter analytics
    const referer = req.headers.referer;
    if (referer) {
      headers["HTTP-Referer"] = referer;
    }

    const title = req.headers["x-title"] as string;
    if (title) {
      headers["X-Title"] = title;
    } else {
      headers["X-Title"] = "JAAZ Cloud Chat";
    }

    // Log the request for the authenticated user
    console.log(
      `Chat request from user: ${username} (ID: ${userId}), model: ${modifiedBody.model}`,
    );

    // Forward request to OpenRouter with modified body
    const openrouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify(modifiedBody),
      },
    );

    // Check if response is successful
    if (!openrouterResponse.ok) {
      console.error(
        `OpenRouter error: ${openrouterResponse.status} - ${openrouterResponse.statusText}`,
      );
      const errorText = await openrouterResponse.text();
      return res.status(openrouterResponse.status).send(errorText);
    }

    // Handle streaming vs non-streaming responses
    const contentType = openrouterResponse.headers.get("content-type");
    const isStreaming = contentType?.includes("text/event-stream");

    if (isStreaming) {
      // Set headers for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream the response
      const reader = openrouterResponse.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: "Failed to read stream" });
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder().decode(value);

          // Look for the usage data in SSE format
          if (text.includes('"usage"')) {
            try {
              const lines = text.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim();
                  if (data && data !== "[DONE]") {
                    const parsed = JSON.parse(data);
                    if (parsed.usage) {
                      console.log(`Token usage for ${username} (${userId}):`, {
                        model: modifiedBody.model,
                        prompt_tokens: parsed.usage.prompt_tokens,
                        completion_tokens: parsed.usage.completion_tokens,
                        total_tokens: parsed.usage.total_tokens,
                        cost: parsed.usage.cost,
                        cached_tokens:
                          parsed.usage.prompt_tokens_details?.cached_tokens ||
                          0,
                        reasoning_tokens:
                          parsed.usage.completion_tokens_details
                            ?.reasoning_tokens || 0,
                        timestamp: new Date().toISOString(),
                      });
                    }
                  }
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }

          res.write(value);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      // For non-streaming responses, parse JSON and log usage
      const responseData = await openrouterResponse.json();

      // Log token usage if available
      if (responseData.usage) {
        console.log(`Token usage for ${username} (${userId}):`, {
          model: modifiedBody.model,
          prompt_tokens: responseData.usage.prompt_tokens,
          completion_tokens: responseData.usage.completion_tokens,
          total_tokens: responseData.usage.total_tokens,
          cost: responseData.usage.cost,
          cached_tokens:
            responseData.usage.prompt_tokens_details?.cached_tokens || 0,
          reasoning_tokens:
            responseData.usage.completion_tokens_details?.reasoning_tokens || 0,
          timestamp: new Date().toISOString(),
        });
      }

      // Forward response headers
      openrouterResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      return res.status(openrouterResponse.status).json(responseData);
    }
  } catch (error) {
    console.error("Error in chat completions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
