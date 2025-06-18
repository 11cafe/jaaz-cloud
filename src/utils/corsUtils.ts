import { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";

/**
 * CORS configuration type
 */
export interface CorsConfig {
  methods?: string[];
  origin?: string | string[];
  credentials?: boolean;
  optionsSuccessStatus?: number;
  allowedHeaders?: string[];
}

/**
 * Common CORS configuration for API routes
 * 通用的API路由CORS配置
 */
export const defaultCorsConfig: CorsConfig = {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  origin: "*",
  credentials: false,
  optionsSuccessStatus: 200,
  allowedHeaders: ["Content-Type", "Authorization", "X-Title"],
};

/**
 * Apply CORS configuration and handle OPTIONS requests
 * 应用CORS配置并处理OPTIONS预检请求
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @param corsConfig - Optional custom CORS configuration
 * @returns true if request should continue, false if it was an OPTIONS request
 */
export async function applyCors(
  req: NextApiRequest,
  res: NextApiResponse,
  corsConfig: CorsConfig = defaultCorsConfig,
): Promise<boolean> {
  // Merge with default config to ensure all required fields are present
  const finalConfig = {
    ...defaultCorsConfig,
    ...corsConfig,
  };

  await NextCors(req, res, finalConfig);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }

  return true;
}

/**
 * Specific CORS configuration for device authentication APIs
 * 设备认证API的特定CORS配置
 */
export const deviceAuthCorsConfig: CorsConfig = {
  methods: ["GET", "POST", "OPTIONS"],
};
