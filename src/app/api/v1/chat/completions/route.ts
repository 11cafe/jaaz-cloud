import { NextRequest } from "next/server";
import OpenAI from "openai";
import { authenticateAppRequest } from "@/utils/auth";
import { serverConsume } from "@/utils/serverConsume";
import { TransactionType } from "@/schema";
import {
  checkUserBalance,
  createInsufficientBalanceResponse,
} from "@/utils/balanceCheck";

// 扩展 OpenAI 类型以包含 OpenRouter 的 cost 字段
interface ExtendedCompletionUsage extends OpenAI.CompletionUsage {
  cost?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    [key: string]: any;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    [key: string]: any;
  };
}

interface ExtendedChatCompletionChunk
  extends Omit<OpenAI.ChatCompletionChunk, "usage"> {
  usage?: ExtendedCompletionUsage | null;
}

interface ExtendedChatCompletion extends Omit<OpenAI.ChatCompletion, "usage"> {
  usage?: ExtendedCompletionUsage;
}

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

    // Initialize OpenAI client with OpenRouter configuration
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openrouterApiKey,
      defaultHeaders: {
        "HTTP-Referer": req.headers.get("referer") || "https://jaaz.app",
        "X-Title": req.headers.get("x-title") || "Jaaz App",
      },
    });

    // Parse the request body
    const requestBody = await req.json();

    // Log the request for the authenticated user
    console.log(
      `Chat request from user: ${username} (ID: ${userId}), model: ${requestBody.model}`,
    );

    // Check if streaming is requested
    const isStreamingRequest = requestBody.stream === true;

    if (isStreamingRequest) {
      // Handle streaming response - 使用正确的参数
      const response = await openai.chat.completions.create({
        ...requestBody,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      });

      // For streaming, the response is actually a stream
      const stream = response as any; // Type assertion needed for OpenRouter compatibility

      // Create a new readable stream that processes the OpenAI stream
      const transformedStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          try {
            for await (const chunk of stream) {
              // Type assertion for the chunk to include our extended usage
              const extendedChunk = chunk as ExtendedChatCompletionChunk;

              // Check if this chunk contains usage information
              if (extendedChunk.usage) {
                // console.log(
                //   `Token usage for ${username} (${userId}) [STREAMING]:`,
                //   {
                //     model: requestBody.model,
                //     prompt_tokens: extendedChunk.usage.prompt_tokens,
                //     completion_tokens: extendedChunk.usage.completion_tokens,
                //     total_tokens: extendedChunk.usage.total_tokens,
                //     cost: extendedChunk.usage.cost,
                //     cached_tokens:
                //       extendedChunk.usage.prompt_tokens_details
                //         ?.cached_tokens || 0,
                //     reasoning_tokens:
                //       extendedChunk.usage.completion_tokens_details
                //         ?.reasoning_tokens || 0,
                //     timestamp: new Date().toISOString(),
                //   },
                // );

                // Record consumption based on cost
                if (extendedChunk.usage.cost && extendedChunk.usage.cost > 0) {
                  const description = `type: text, model: ${requestBody.model}, total_tokens: ${extendedChunk.usage.total_tokens}`;

                  serverConsume({
                    userId,
                    amount: extendedChunk.usage.cost,
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

              // Convert chunk to SSE format and send to client
              const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }

            // Send the final [DONE] message
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Error processing streaming response:", error);
            controller.error(error);
          }
        },
      });

      return new Response(transformedStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Title",
        },
      });
    } else {
      // Handle non-streaming response
      const completion = (await openai.chat.completions.create({
        ...requestBody,
        stream: false,
        stream_options: {
          include_usage: true,
        },
      })) as ExtendedChatCompletion;

      // Log token usage if available
      if (completion.usage) {
        console.log(`Token usage for ${username} (${userId}):`, {
          model: requestBody.model,
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
          cost: completion.usage.cost,
          cached_tokens:
            completion.usage.prompt_tokens_details?.cached_tokens || 0,
          reasoning_tokens:
            completion.usage.completion_tokens_details?.reasoning_tokens || 0,
          timestamp: new Date().toISOString(),
        });

        // Record consumption based on cost
        if (completion.usage.cost && completion.usage.cost > 0) {
          const description = `type: text, model: ${requestBody.model}, total_tokens: ${completion.usage.total_tokens}`;

          serverConsume({
            userId,
            amount: completion.usage.cost,
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

      return new Response(JSON.stringify(completion), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Title",
        },
      });
    }
  } catch (error) {
    console.error("Error in chat completions:", error);

    // Handle OpenAI API errors specifically
    if (error instanceof OpenAI.APIError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          type: error.type,
          code: error.code,
        }),
        {
          status: error.status || 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

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
