import { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { serverConsume } from "@/utils/serverConsume";
import { TransactionType } from "@/schema";
import {
  checkUserBalance,
  createInsufficientBalanceResponse,
} from "@/utils/balanceCheck";
import NextCors from "nextjs-cors";

// Allow streaming responses up to 90 seconds
export const maxDuration = 90;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  await NextCors(req, res, {
    methods: ["POST", "OPTIONS"],
    origin: "*",
    credentials: false,
    optionsSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization", "X-Title"],
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
      `Chat request blocked for user: ${username} (ID: ${userId}) - Insufficient balance: $${balanceCheck.balance}`,
    );
    return res
      .status(402)
      .json(createInsufficientBalanceResponse(balanceCheck.balance));
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

                      // Record consumption based on cost
                      if (parsed.usage.cost && parsed.usage.cost > 0) {
                        const description = `type: text, model: ${modifiedBody.model}, total_tokens: ${parsed.usage.total_tokens}`;

                        serverConsume({
                          userId,
                          amount: parsed.usage.cost,
                          description,
                          transactionType: TransactionType.CONSUME_TEXT,
                        }).catch((error) => {
                          console.error(
                            `Failed to record consumption for user ${username} (${userId}):`,
                            error,
                          );
                        });
                      }
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

        // Record consumption based on cost
        if (responseData.usage.cost && responseData.usage.cost > 0) {
          const description = `type: text, model: ${modifiedBody.model}, total_tokens: ${responseData.usage.total_tokens}`;

          serverConsume({
            userId,
            amount: responseData.usage.cost,
            description,
            transactionType: TransactionType.CONSUME_TEXT,
          }).catch((error) => {
            console.error(
              `Failed to record consumption for user ${username} (${userId}):`,
              error,
            );
          });
        }
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
