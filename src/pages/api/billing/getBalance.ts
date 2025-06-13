import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { AccountSchema } from "@/schema";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return; // authenticateRequest already sent error response
  }

  const { userId } = authResult;

  try {
    const rows = await drizzleDb
      .select()
      .from(AccountSchema)
      .where(eq(AccountSchema.id, userId));

    res.status(200).json({
      balance: rows[0]?.balance ?? "0.00",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch get balance, because ${error}` });
  }
}
