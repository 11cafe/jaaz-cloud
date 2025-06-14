import { AccountSchema } from "@/schema";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { eq } from "drizzle-orm";

interface BalanceCheckResult {
  hasBalance: boolean;
  balance: number;
  error?: string;
}

/**
 * Check if user has sufficient balance (greater than 0)
 * @param userId - User ID to check balance for
 * @returns Promise with balance check result
 */
export const checkUserBalance = async (
  userId: number,
): Promise<BalanceCheckResult> => {
  try {
    const accountRows = await drizzleDb
      .select()
      .from(AccountSchema)
      .where(eq(AccountSchema.id, userId));

    const currentBalance = Number(accountRows[0]?.balance ?? 0);

    return {
      hasBalance: currentBalance > 0,
      balance: currentBalance,
    };
  } catch (error) {
    console.error("Error checking user balance:", error);
    return {
      hasBalance: false,
      balance: 0,
      error: "Failed to check account balance",
    };
  }
};

/**
 * Standard insufficient balance response
 */
export const createInsufficientBalanceResponse = (balance: number) => ({
  error:
    "Insufficient balance. Please recharge your account to continue using the service.",
  balance,
  code: "INSUFFICIENT_BALANCE",
});
