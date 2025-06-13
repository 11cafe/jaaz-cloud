import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { AccountSchema } from "@/schema";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    res.status(401).json({ error: "Unauthorized! Please loggin." });
    return;
  }

  try {
    const rows = await drizzleDb
      .select()
      .from(AccountSchema)
      .where(eq(AccountSchema.id, session?.user?.id));

    res.status(200).json({
      balance: rows[0]?.balance ?? "0.00",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch get balance, because ${error}` });
  }
}
