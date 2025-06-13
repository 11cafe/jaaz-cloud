import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ERechargePaymentState } from "@/consts/types";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { AccountSchema, TransactionsSchema, TransactionType } from "@/schema";
import { eq, sql } from "drizzle-orm";
import { addWithPrecision } from "@/utils/mathUtils";
import { nanoid } from "nanoid";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const isDev = process.env.NODE_ENV === "development";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { amount } = req.body;
  if (!amount) {
    res.status(400).json({ error: "The amount should not be null." });
    return;
  }

  // In development environment, simulate successful recharge without Stripe
  if (isDev) {
    try {
      const authResult = await authenticateRequest(req, res);
      if (!authResult) {
        return; // authenticateRequest already sent error response
      }

      const { userId } = authResult;

      // Simulate successful payment by directly updating balance
      await drizzleDb.transaction(async (trx) => {
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
          stripe_session_id: `dev_session_${nanoid()}`, // Mock session ID for dev
          previous_balance: sql`${currentBalance}`,
          after_balance: sql`${newBalance}`,
          description: `${TransactionType.RECHARGE} (Dev Mode)`,
          transaction_type: TransactionType.RECHARGE,
          created_at: new Date().toISOString(),
        });
      });

      // Return success with mock session ID for dev mode
      const mockSessionId = `dev_session_${nanoid()}`;
      const successUrl = `${req.headers.origin}/billing?paymentState=${ERechargePaymentState.SUCCESS}&sessionId=${mockSessionId}`;

      res.status(200).json({
        success: true,
        url: successUrl,
        devMode: true,
        message: "Development mode: Recharge simulated successfully",
      });
    } catch (error) {
      console.error("Dev mode recharge error:", error);
      res.status(500).json({
        error: `Failed to simulate recharge in dev mode: ${error}`,
      });
    }
    return;
  }

  // Production mode: use real Stripe
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    res.status(401).json({ error: "Unauthorized! Please login." });
    return;
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Recharge Nodecafe Account",
            },
            unit_amount: amount * 100, // Amount in cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { userId: session.user.id }, // When the webhook successfully processes the payment, it updates the corresponding user's account balance
      success_url: `${req.headers.origin}/billing?paymentState=${ERechargePaymentState.SUCCESS}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/billing?paymentState=${ERechargePaymentState.CANCEL}`,
    });

    res.status(200).json({ success: true, url: checkoutSession.url });
  } catch (err) {
    const { statusCode, message } = res as unknown as {
      statusCode: number;
      message: string;
    };
    res.status(statusCode || 500).json({
      error: `Failed to create checkout session, because ${message ?? err}`,
    });
  }
}
