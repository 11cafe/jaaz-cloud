import { AccountSchema, TransactionsSchema, TransactionType } from "@/schema";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { addWithPrecision } from "@/utils/mathUtils";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { buffer } from "micro";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default body parser
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("Stripe Webhook received");
  await NextCors(req, res, {
    methods: ["POST"],
    origin: "*",
  });
  const buf = await buffer(req);
  let event;

  // Verify that the request is from Stripe
  if (endpointSecret) {
    const signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(buf, signature, endpointSecret);
    } catch (err) {
      const { message } = err as unknown as { message: string };
      console.log(`⚠️  Webhook signature verification failed.`, message);
      return res
        .status(400)
        .send(`Webhook signature verification failed: ${message}`);
    }
  } else {
    return res.status(500).send("Webhook signing secret not found.");
  }

  // Quickly return a 2xx response
  // Your endpoint must quickly return a successful status code (2xx) prior to any complex logic that could cause a timeout
  res.status(200).end();

  switch (event.type) {
    case "checkout.session.completed":
      /**
       * Handle transaction completion events
       * 1. Check for event duplication;
       * 2. Update the corresponding user's balance in the transaction and insert a new transaction record;
       */
      const paymentIntent = event.data.object;
      const userId = paymentIntent.metadata.userId;
      const sessionIdDuplicateCheck = await drizzleDb
        .select()
        .from(TransactionsSchema)
        .where(
          and(
            eq(TransactionsSchema.author_id, userId),
            eq(TransactionsSchema.stripe_session_id, paymentIntent.id),
          ),
        )
        .limit(1);
      if (sessionIdDuplicateCheck.length) {
        console.log(
          "Stripe Webhook: The recharge success event corresponding to this id has been processed",
        );
        return;
      }

      await drizzleDb.transaction(async (trx) => {
        const amount = paymentIntent.amount_total / 100; // Amount in cents,
        const accountResList = await trx.execute(
          sql`SELECT balance FROM ${AccountSchema} WHERE id = ${userId} FOR UPDATE`,
        );

        const currentBalance = Number(accountResList[0]?.balance ?? 0);
        let newBalance;
        newBalance = addWithPrecision(currentBalance, amount);

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

        await trx.insert(TransactionsSchema).values({
          id: nanoid(),
          author_id: userId,
          amount: sql`${amount}`,
          stripe_session_id: paymentIntent.id,
          previous_balance: sql`${currentBalance}`,
          after_balance: sql`${newBalance}`,
          description: TransactionType.RECHARGE,
          transaction_type: TransactionType.RECHARGE,
          created_at: new Date().toISOString(),
        });
      });
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }
}
