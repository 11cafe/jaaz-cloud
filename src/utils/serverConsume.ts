import { TransactionsSchema, TransactionType, AccountSchema } from "@/schema";
import { eq, sql } from "drizzle-orm";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { subtractWithPrecision, validateAmount } from "@/utils/mathUtils";
import { nanoid } from "nanoid";

interface ConsumeOptions {
  userId: number;
  amount: number;
  description?: string;
  transactionType?: TransactionType;
}

/**
 * Server-side consumption function for direct use in API endpoints
 * Returns success status and error message if any
 */
export const serverConsume = async ({
  userId,
  amount,
  description,
  transactionType = TransactionType.CONSUME_TEXT,
}: ConsumeOptions): Promise<{ success: boolean; error?: string }> => {
  const validation = validateAmount(amount);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Invalid amount.",
    };
  }

  try {
    let success = false;
    let error: string | undefined;

    await drizzleDb.transaction(async (trx) => {
      const accountResList = await trx.execute(
        sql`SELECT balance FROM ${AccountSchema} WHERE id = ${userId} FOR UPDATE`,
      );
      const currentBalance = Number(accountResList[0]?.balance ?? 0);

      if (currentBalance < amount) {
        error = "Insufficient balance, please recharge and try again";
        throw new Error("Insufficient balance");
      }

      const newBalance = subtractWithPrecision(currentBalance, amount);

      if (accountResList.length) {
        await trx
          .update(AccountSchema)
          .set({
            balance: sql`${newBalance}`,
          })
          .where(eq(AccountSchema.id, userId));
      } else {
        await trx.insert(AccountSchema).values({
          id: userId,
          balance: sql`${newBalance}`,
        });
      }

      // Insert transaction record
      await trx.insert(TransactionsSchema).values({
        id: nanoid(),
        author_id: userId,
        amount: sql`${amount}`,
        previous_balance: sql`${currentBalance}`,
        after_balance: sql`${newBalance}`,
        description: description ?? transactionType,
        transaction_type: transactionType,
        created_at: new Date().toISOString(),
      });

      success = true;
    });

    return { success, error };
  } catch (err) {
    return {
      success: false,
      error: `Failed to consume: ${err}`,
    };
  }
};
