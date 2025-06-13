import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { TransactionsSchema } from "@/schema";
import { eq, desc, and } from "drizzle-orm";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import type { Transaction } from "@/server/dbTypes";

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
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const pageNumber = parseInt(req.query.pageNumber as string) || 1;
    const stripeSessionID = req.query.stripeSessionID as string;
    const offset = (Number(pageNumber) - 1) * pageSize;

    const whereList = stripeSessionID
      ? and(
          eq(TransactionsSchema.author_id, userId),
          eq(TransactionsSchema.stripe_session_id, stripeSessionID),
        )
      : eq(TransactionsSchema.author_id, userId);

    const row = await drizzleDb
      .select()
      .from(TransactionsSchema)
      .where(whereList)
      .orderBy(desc(TransactionsSchema.created_at))
      .limit(pageSize)
      .offset(offset);

    res.status(200).json({
      data: row,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch list transactions, because ${error}` });
  }
}
