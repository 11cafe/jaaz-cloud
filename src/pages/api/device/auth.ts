/**
 * Device Authentication Code Generation API
 *
 * 设备认证码生成接口
 * 用于设备流OAuth认证的第一步，生成设备认证码和过期时间
 *
 * POST /api/device/auth
 * - 生成唯一的设备认证码 (device_code)
 * - 设置10分钟的过期时间
 * - 返回设备认证码和过期时间供客户端使用
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { DeviceAuthRequestSchema } from "@/schema";
import { nanoid } from "nanoid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 生成唯一 device_code
  const device_code = nanoid(32);
  const expires_in = 600; // 10分钟
  const now = Date.now();
  const expires_at = now + expires_in * 1000;

  try {
    const result = await drizzleDb.insert(DeviceAuthRequestSchema).values({
      device_code,
      status: "pending",
      expires_at,
      created_at: now,
    });

    console.log("Creating device code with times:", {
      current_timestamp: now,
      current_iso: new Date(now).toISOString(),
      expires_timestamp: expires_at,
      expires_iso: new Date(expires_at).toISOString(),
      expires_in_seconds: expires_in,
    });
    console.log("Insert result:", result);

    return res.status(200).json({
      code: device_code,
      expires_at: expires_at,
    });
  } catch (e) {
    console.error("Failed to create device code:", e);
    return res.status(500).json({
      error: "Failed to create device code",
      details: e instanceof Error ? e.message : String(e),
    });
  }
}
