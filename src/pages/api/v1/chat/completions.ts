import { NextRequest } from "next/server";

// Allow streaming responses up to 90 seconds
export const maxDuration = 90;

// Use edge runtime for better performance
export const runtime = "edge";

export default async function handler(req: NextRequest) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get OpenRouter API key from environment variables
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterApiKey) {
    console.error("OPENROUTER_API_KEY is not set in environment variables");
    return new Response(
      JSON.stringify({ error: "OpenRouter API key is not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Prepare headers for OpenRouter
    const headers: Record<string, string> = {
      Authorization: `Bearer ${openrouterApiKey}`,
      "Content-Type": req.headers.get("content-type") || "application/json",
    };

    // Add optional headers for OpenRouter analytics
    const referer =
      req.headers.get("referer") || req.headers.get("http-referer");
    if (referer) {
      headers["HTTP-Referer"] = referer;
    }

    const title = req.headers.get("x-title");
    if (title) {
      headers["X-Title"] = title;
    } else {
      headers["X-Title"] = "JAAZ Cloud Chat";
    }

    // Forward request to OpenRouter with original body stream
    const openrouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: req.body, // Forward original request body stream
        duplex: "half", // Required for streaming request bodies
      } as RequestInit,
    );

    // Forward response with original headers and status
    const responseHeaders = new Headers();

    // Copy important response headers
    const headersToForward = [
      "content-type",
      "cache-control",
      "connection",
      "transfer-encoding",
    ];

    headersToForward.forEach((headerName) => {
      const headerValue = openrouterResponse.headers.get(headerName);
      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    });

    // Set additional headers for streaming if needed
    if (
      openrouterResponse.headers
        .get("content-type")
        ?.includes("text/event-stream")
    ) {
      responseHeaders.set("Cache-Control", "no-cache");
      responseHeaders.set("Connection", "keep-alive");
    }

    return new Response(openrouterResponse.body, {
      status: openrouterResponse.status,
      statusText: openrouterResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error in chat completions:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
