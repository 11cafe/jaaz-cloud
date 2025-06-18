/**
 * Device Authorization Polling API
 *
 * 设备授权轮询接口
 * 用于设备流OAuth认证的第三步，设备轮询检查授权状态
 *
 * GET /api/device/poll?code={device_code}
 * - 根据设备认证码查询授权状态
 * - 返回pending（等待中）、authorized（已授权）或expired（已过期）状态
 * - 当状态为authorized时返回访问令牌和用户profile信息
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { DeviceAuthRequestSchema, UserSchema } from "@/schema";
import { eq } from "drizzle-orm";
import { isExpired } from "@/utils/datatimeUtils";
import { applyCors, deviceAuthCorsConfig } from "@/utils/corsUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Apply CORS configuration
  const shouldContinue = await applyCors(req, res, deviceAuthCorsConfig);
  if (!shouldContinue) {
    return; // OPTIONS request was handled
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = req.query.code as string;
  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  const rows = await drizzleDb
    .select()
    .from(DeviceAuthRequestSchema)
    .where(eq(DeviceAuthRequestSchema.device_code, code));
  const record = rows[0];

  if (!record) {
    return res.status(404).json({ error: "Code not found" });
  }

  if (isExpired(record.expires_at)) {
    return res.status(410).json({ status: "expired" });
  }

  if (record.status === "authorized") {
    // Query user information
    if (record.user_id) {
      const userRows = await drizzleDb
        .select()
        .from(UserSchema)
        .where(eq(UserSchema.id, record.user_id));
      const user = userRows[0];

      if (user) {
        return res.status(200).json({
          status: "authorized",
          token: record.access_token,
          user_info: {
            id: user.id,
            email: user.email,
            username: user.username,
            image_url: user.image_url,
            provider: user.provider,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
        });
      }
    }

    // Fallback if user not found but status is authorized
    return res
      .status(200)
      .json({ status: "authorized", token: record.access_token });
  }

  return res.status(200).json({ status: record.status });
}
