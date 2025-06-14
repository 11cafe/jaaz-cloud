/**
 * Device Authorization API
 *
 * 设备授权接口
 * 用于设备流OAuth认证的第二步，用户授权设备访问
 *
 * POST /api/device/authorize
 * - 验证设备认证码的有效性
 * - 检查用户信息并生成JWT访问令牌
 * - 更新设备认证状态为已授权
 * - 完成设备与用户账户的绑定
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { DeviceAuthRequestSchema, UserSchema } from "@/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { isExpired } from "@/utils/datatimeUtils";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { code, user } = req.body;
  if (!code || !user || !user.id) {
    return res.status(400).json({ error: "Missing code or user info" });
  }
  // 查找 code
  const rows = await drizzleDb
    .select()
    .from(DeviceAuthRequestSchema)
    .where(eq(DeviceAuthRequestSchema.device_code, code));
  const record = rows[0];

  if (!record) {
    return res.status(404).json({ error: "Code not found" });
  }
  if (record.status !== "pending") {
    return res.status(400).json({ error: "Code already used or expired" });
  }

  // 使用工具函数检查是否过期
  if (isExpired(record.expires_at)) {
    return res.status(410).json({ error: "Code expired" });
  }

  // 查找用户
  const userRows = await drizzleDb
    .select()
    .from(UserSchema)
    .where(eq(UserSchema.id, user.id));
  const userInDb = userRows[0];
  if (!userInDb) {
    return res.status(404).json({ error: "User not found" });
  }

  // 生成 access_token（JWT）
  const token = jwt.sign(
    {
      id: userInDb.id,
      email: userInDb.email,
      username: userInDb.username,
      provider: userInDb.provider,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );

  // 更新数据库
  const updateResult = await drizzleDb
    .update(DeviceAuthRequestSchema)
    .set({
      user_id: userInDb.id,
      access_token: token,
      status: "authorized",
    })
    .where(eq(DeviceAuthRequestSchema.device_code, code));

  // console.log("Database update result:", updateResult);

  return res.status(200).json({ success: true });
}
