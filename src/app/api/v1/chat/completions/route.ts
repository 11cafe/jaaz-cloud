import { NextRequest } from "next/server";
import { authenticateAppRequest } from "@/utils/auth";
import { serverConsume } from "@/utils/serverConsume";
import { TransactionType } from "@/schema";
import {
  checkUserBalance,
  createInsufficientBalanceResponse,
} from "@/utils/balanceCheck";

// 关于这个 api 为什么要写在这里，为了支持 streaming
// 可参考： https://dev.to/bsorrentino/how-to-stream-data-over-http-using-nextjs-1kmb

// Allow streaming responses up to 180 seconds
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    // Check authentication using shared utility
    const authResult = await authenticateAppRequest(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Title",
        },
      });
    }

    const { userId, username } = authResult.data!;

    // Check user balance before proceeding
    const balanceCheck = await checkUserBalance(userId);
    if (balanceCheck.error) {
      return new Response(JSON.stringify({ error: balanceCheck.error }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!balanceCheck.hasBalance) {
      console.log(
        `Chat request blocked for user: ${username} (ID: ${userId}) - Insufficient balance: $${balanceCheck.balance}`,
      );
      return new Response(
        JSON.stringify(createInsufficientBalanceResponse(balanceCheck.balance)),
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Get OpenRouter API key from environment variables
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterApiKey) {
      console.error("OPENROUTER_API_KEY is not set in environment variables");
      return new Response(
        JSON.stringify({ error: "Jaaz Cloud API key is not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Parse the request body
    const requestBody = await req.json();

    // Add usage tracking to the request while preserving original stream setting
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
    const referer = req.headers.get("referer");
    if (referer) {
      headers["HTTP-Referer"] = referer;
    }

    const title = req.headers.get("x-title");
    if (title) {
      headers["X-Title"] = title;
    } else {
      headers["X-Title"] = "JAAZ Cloud Chat";
    }

    // Log the request for the authenticated user
    console.log(
      `Chat request from user: ${username} (ID: ${userId}), model: ${modifiedBody.model}`,
    );

    // Forward request to OpenRouter
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
      return new Response(errorText, {
        status: openrouterResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Check if OpenRouter actually returned streaming response
    const contentType = openrouterResponse.headers.get("content-type");
    const isStreaming = contentType?.includes("text/event-stream");

    if (isStreaming) {
      // For streaming responses, we need to intercept the stream to capture usage data
      // Create a new readable stream that processes the original stream
      const transformedStream = new ReadableStream({
        start(controller) {
          const reader = openrouterResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          const processChunk = async () => {
            try {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                return;
              }

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process complete SSE messages
              const lines = buffer.split("\n");
              buffer = lines.pop() || ""; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim();

                  if (data === "[DONE]") {
                    // Forward the DONE message and close
                    controller.enqueue(new TextEncoder().encode(line + "\n"));
                    controller.close();
                    return;
                  }

                  try {
                    const jsonData = JSON.parse(data);

                    // Check if this chunk contains usage information
                    if (jsonData.usage) {
                      // console.log(
                      //   `Token usage for ${username} (${userId}) [STREAMING]:`,
                      //   {
                      //     model: modifiedBody.model,
                      //     prompt_tokens: jsonData.usage.prompt_tokens,
                      //     completion_tokens: jsonData.usage.completion_tokens,
                      //     total_tokens: jsonData.usage.total_tokens,
                      //     cost: jsonData.usage.cost,
                      //     cached_tokens:
                      //       jsonData.usage.prompt_tokens_details
                      //         ?.cached_tokens || 0,
                      //     reasoning_tokens:
                      //       jsonData.usage.completion_tokens_details
                      //         ?.reasoning_tokens || 0,
                      //     timestamp: new Date().toISOString(),
                      //   },
                      // );

                      // Record consumption based on cost
                      if (jsonData.usage.cost && jsonData.usage.cost > 0) {
                        const description = `type: text, model: ${modifiedBody.model}, total_tokens: ${jsonData.usage.total_tokens}`;

                        serverConsume({
                          userId,
                          amount: jsonData.usage.cost,
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
                  } catch (parseError) {
                    // If JSON parsing fails, it's likely a comment or malformed data
                    // Just forward it as-is
                  }
                }

                // Forward the line to the client
                controller.enqueue(new TextEncoder().encode(line + "\n"));
              }

              processChunk();
            } catch (error) {
              console.error("Error processing streaming chunk:", error);
              controller.error(error);
            }
          };

          processChunk();
        },
      });

      // Create response headers
      const responseHeaders = new Headers();

      // Copy all headers from OpenRouter response
      openrouterResponse.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });

      // Add CORS headers
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      responseHeaders.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Title",
      );

      // Return the transformed streaming response
      return new Response(transformedStream, {
        status: openrouterResponse.status,
        headers: responseHeaders,
      });
    } else {
      // For non-streaming responses, parse JSON and log usage
      const responseData = await openrouterResponse.json();

      // Log token usage if available
      if (responseData.usage) {
        // console.log(`Token usage for ${username} (${userId}):`, {
        //   model: modifiedBody.model,
        //   prompt_tokens: responseData.usage.prompt_tokens,
        //   completion_tokens: responseData.usage.completion_tokens,
        //   total_tokens: responseData.usage.total_tokens,
        //   cost: responseData.usage.cost,
        //   cached_tokens:
        //     responseData.usage.prompt_tokens_details?.cached_tokens || 0,
        //   reasoning_tokens:
        //     responseData.usage.completion_tokens_details?.reasoning_tokens || 0,
        //   timestamp: new Date().toISOString(),
        // });

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

      // Create response headers
      const responseHeaders = new Headers();

      // Copy all headers from OpenRouter response
      openrouterResponse.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });

      // Add CORS headers
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      responseHeaders.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Title",
      );

      return new Response(JSON.stringify(responseData), {
        status: openrouterResponse.status,
        headers: responseHeaders,
      });
    }
  } catch (error) {
    console.error("Error in chat completions:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Title",
      "Access-Control-Max-Age": "86400",
    },
  });
}
