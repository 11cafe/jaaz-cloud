import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { AccountSchema, TransactionsSchema, TransactionType } from "@/schema";
import { eq, sql, and } from "drizzle-orm";
import { addWithPrecision } from "@/utils/mathUtils";
import { nanoid } from "nanoid";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    res.status(400).json({ error: "Payment Intent ID is required" });
    return;
  }

  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({
      error:
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
    });
    return;
  }

  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return;
  }

  const { userId } = authResult;

  try {
    // Check if this payment has already been processed
    const existingTransaction = await drizzleDb
      .select()
      .from(TransactionsSchema)
      .where(
        and(
          eq(TransactionsSchema.author_id, userId),
          eq(TransactionsSchema.stripe_session_id, paymentIntentId),
        ),
      )
      .limit(1);

    if (existingTransaction.length > 0) {
      res.status(200).json({
        status: "already_processed",
        message: "Payment has already been processed",
      });
      return;
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Process the successful payment
      await drizzleDb.transaction(async (trx) => {
        const amount = paymentIntent.amount / 100; // Convert from cents
        const accountResList = await trx.execute(
          sql`SELECT balance FROM ${AccountSchema} WHERE id = ${userId} FOR UPDATE`,
        );

        const currentBalance = Number(accountResList[0]?.balance ?? 0);
        const newBalance = addWithPrecision(currentBalance, amount);

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
          stripe_session_id: paymentIntentId,
          previous_balance: sql`${currentBalance}`,
          after_balance: sql`${newBalance}`,
          description: TransactionType.RECHARGE,
          transaction_type: TransactionType.RECHARGE,
          created_at: new Date().toISOString(),
        });
      });

      res.status(200).json({
        status: "succeeded",
        message: "Payment processed successfully",
      });
    } else {
      res.status(200).json({
        status: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({
      error: `Failed to check payment status: ${error}`,
    });
  }
}
