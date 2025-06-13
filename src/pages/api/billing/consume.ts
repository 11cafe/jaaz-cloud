import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { TransactionsSchema, TransactionType, AccountSchema } from "@/schema";
import { eq, sql } from "drizzle-orm";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { subtractWithPrecision } from "@/utils/mathUtils";
import { nanoid } from "nanoid";

interface RecordExpenseRequestBody {
  amount: number;
  description?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    res
      .status(401)
      .json({ success: false, error: "Unauthorized! Please loggin." });
    return;
  }

  if (req.method === "POST") {
    const { amount, description } = req.body as RecordExpenseRequestBody;

    if (!amount) {
      res
        .status(400)
        .json({ success: false, error: "The amount should not be null." });
      return;
    }

    try {
      await drizzleDb.transaction(async (trx) => {
        const accountResList = await trx.execute(
          sql`SELECT balance FROM ${AccountSchema} WHERE id = ${session.user.id} FOR UPDATE`,
        );
        const currentBalance = Number(accountResList[0]?.balance ?? 0);
        let newBalance;

        if (currentBalance < amount) {
          res.status(403).json({
            success: false,
            error: "Insufficient balance, please recharge and try again",
          });
          throw new Error("Insufficient balance");
        }

        newBalance = subtractWithPrecision(currentBalance, amount);

        if (accountResList.length) {
          await trx
            .update(AccountSchema)
            .set({
              balance: sql`${newBalance}`,
            })
            .where(eq(AccountSchema.id, session.user.id));
        } else {
          await trx.insert(AccountSchema).values({
            id: session.user.id,
            balance: sql`${newBalance}`,
          });
        }

        // 插入交易记录
        await trx.insert(TransactionsSchema).values({
          id: nanoid(),
          author_id: session.user.id,
          amount: sql`${amount}`,
          previous_balance: sql`${currentBalance}`,
          after_balance: sql`${newBalance}`,
          description: description ?? TransactionType.CONSUME,
          transaction_type: TransactionType.CONSUME,
          created_at: new Date().toISOString(),
        });

        res.status(200).json({ success: true });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `"Failed to consume, because ${error}`,
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
