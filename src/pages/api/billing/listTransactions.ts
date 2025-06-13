import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { TransactionsSchema } from "@/schema";
import { eq, desc, and } from "drizzle-orm";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import type { Transaction } from "@/server/dbTypes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    res.status(401).json({ error: "Unauthorized! Please loggin." });
    return;
  }

  try {
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const pageNumber = parseInt(req.query.pageNumber as string) || 1;
    const stripeSessionID = req.query.stripeSessionID as string;
    const offset = (Number(pageNumber) - 1) * pageSize;

    const whereList = stripeSessionID
      ? and(
          eq(TransactionsSchema.author_id, session?.user.id),
          eq(TransactionsSchema.stripe_session_id, stripeSessionID),
        )
      : eq(TransactionsSchema.author_id, session?.user.id);

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
