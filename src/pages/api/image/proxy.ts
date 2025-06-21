/**
 * 图片代理API
 * 功能：代理获取S3图片，解决CORS问题
 * 方法：GET
 * 认证：需要用户登录
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { url } = req.query;

    // Validate URL parameter
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    // Validate that the URL is from our S3 bucket
    const allowedDomains = [
      "jaaz.s3.ap-northeast-1.amazonaws.com",
      "comfyspace.s3.us-west-1.amazonaws.com",
    ];

    let isValidUrl = false;
    try {
      const urlObj = new URL(url);
      isValidUrl = allowedDomains.includes(urlObj.hostname);
    } catch {
      isValidUrl = false;
    }

    if (!isValidUrl) {
      return res.status(400).json({ error: "Invalid URL domain" });
    }

    console.log(`Proxying image request for user ${session.user.id}: ${url}`);

    // Fetch the image from S3
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      );
      return res.status(response.status).json({
        error: `Failed to fetch image: ${response.statusText}`,
      });
    }

    // Get the image data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set appropriate headers
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const contentLength = response.headers.get("content-length");

    res.setHeader("Content-Type", contentType);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    // Return the image data
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Image proxy error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to proxy image",
    });
  }
}
