import { AccountSchema, TransactionsSchema, TransactionType } from "@/schema";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { addWithPrecision } from "@/utils/mathUtils";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { buffer } from "micro";
import Stripe from "stripe";

// Initialize Stripe with proper TypeScript support
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20", // Use the latest stable API version
});

// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const endpointSecret =
  "whsec_55d432895a9fd76bd5a7f6537023f52b94c35bf87f7cae36b045b4e5fc70aac2";

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default body parser
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("=== Stripe Webhook Debug Info ===");
  console.log("Webhook received at:", new Date().toISOString());

  await NextCors(req, res, {
    methods: ["POST"],
    origin: "*",
  });

  if (req.method !== "POST") {
    console.log("❌ Non-POST request received, method:", req.method);
    return res.status(405).end("Method Not Allowed");
  }

  const buf = await buffer(req);
  let event: Stripe.Event;

  // Verify that the request is from Stripe
  if (endpointSecret) {
    const signature = req.headers["stripe-signature"] as string;

    try {
      event = stripe.webhooks.constructEvent(buf, signature, endpointSecret);
      console.log("✅ Webhook signature verification successful");
      console.log("Event type:", event.type);
      console.log("Event ID:", event.id);
    } catch (err) {
      const error = err as Error;
      console.log(`❌ Webhook signature verification failed:`, error.message);
      console.log("Signature received:", signature);
      console.log(
        "Endpoint secret configured:",
        endpointSecret
          ? "Yes (first 10 chars: " + endpointSecret.substring(0, 10) + "...)"
          : "No",
      );
      return res
        .status(400)
        .send(`Webhook signature verification failed: ${error.message}`);
    }
  } else {
    console.log("❌ STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).send("Webhook signing secret not found.");
  }

  // Quickly return a 2xx response
  res.status(200).end();
  console.log("✅ Returned 200 status to Stripe");

  try {
    switch (event.type) {
      case "checkout.session.completed":
        console.log("\n=== Processing checkout.session.completed ===");
        /**
         * Handle Checkout Session completion events (existing functionality)
         * 1. Check for event duplication;
         * 2. Update the corresponding user's balance in the transaction and insert a new transaction record;
         */
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session ID:", checkoutSession.id);
        console.log(
          "Checkout session metadata:",
          JSON.stringify(checkoutSession.metadata, null, 2),
        );
        console.log("Amount total:", checkoutSession.amount_total);
        console.log("Payment status:", checkoutSession.payment_status);

        const checkoutUserId = checkoutSession.metadata?.userId;

        if (!checkoutUserId) {
          console.log("❌ No userId found in checkout session metadata");
          return;
        }

        console.log("User ID from metadata:", checkoutUserId);

        // Check for duplicates
        console.log("Checking for duplicate transactions...");
        const userIdInt = parseInt(checkoutUserId, 10);
        const sessionIdDuplicateCheck = await drizzleDb
          .select()
          .from(TransactionsSchema)
          .where(
            and(
              eq(TransactionsSchema.author_id, userIdInt),
              eq(TransactionsSchema.stripe_session_id, checkoutSession.id),
            ),
          )
          .limit(1);

        if (sessionIdDuplicateCheck.length) {
          console.log("⚠️ Duplicate transaction found, skipping processing");
          console.log(
            "Existing transaction:",
            JSON.stringify(sessionIdDuplicateCheck[0], null, 2),
          );
          return;
        }

        console.log("✅ No duplicate found, proceeding with transaction");

        // Process the payment
        console.log("Starting database transaction...");
        await drizzleDb.transaction(async (trx) => {
          const amount = checkoutSession.amount_total / 100; // Amount in cents
          console.log("Processing amount:", amount);

          const userIdInt = parseInt(checkoutUserId, 10);

          console.log("Fetching current balance for user:", userIdInt);
          const accountResList = await trx.execute(
            sql`SELECT balance FROM ${AccountSchema} WHERE id = ${userIdInt} FOR UPDATE`,
          );

          const currentBalance = Number(accountResList[0]?.balance ?? 0);
          console.log("Current balance:", currentBalance);

          let newBalance = addWithPrecision(currentBalance, amount);
          console.log("New balance will be:", newBalance);

          if (accountResList.length) {
            console.log("Updating existing account...");
            await trx
              .update(AccountSchema)
              .set({
                balance: sql`${newBalance}`,
                updated_at: new Date().toISOString(),
              })
              .where(eq(AccountSchema.id, userIdInt));
          } else {
            console.log("Creating new account...");
            await trx.insert(AccountSchema).values({
              id: userIdInt,
              balance: sql`${newBalance}`,
            });
          }

          const transactionId = nanoid();
          console.log("Creating transaction record with ID:", transactionId);

          await trx.insert(TransactionsSchema).values({
            id: transactionId,
            author_id: userIdInt,
            amount: sql`${amount}`,
            stripe_session_id: checkoutSession.id,
            previous_balance: sql`${currentBalance}`,
            after_balance: sql`${newBalance}`,
            description: `Recharge via Stripe checkout session: ${checkoutSession.id}`,
            transaction_type: TransactionType.RECHARGE,
            created_at: new Date().toISOString(),
          });

          console.log("✅ Transaction record created successfully");
        });

        console.log(
          "✅ checkout.session.completed processing completed successfully",
        );
        break;

      case "payment_intent.succeeded":
        console.log("\n=== Processing payment_intent.succeeded ===");
        /**
         * Handle PaymentIntent success events (for embedded payments)
         * 1. Check for event duplication;
         * 2. Update the corresponding user's balance in the transaction and insert a new transaction record;
         */
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment intent ID:", paymentIntent.id);
        console.log(
          "Payment intent metadata:",
          JSON.stringify(paymentIntent.metadata, null, 2),
        );

        const paymentUserId = paymentIntent.metadata?.userId;

        // Skip if not a recharge payment
        if (paymentIntent.metadata?.type !== "recharge") {
          console.log("⚠️ PaymentIntent is not a recharge, skipping");
          return;
        }

        if (!paymentUserId) {
          console.log("❌ No userId found in payment intent metadata");
          return;
        }

        console.log("User ID from payment intent:", paymentUserId);

        const paymentUserIdInt = parseInt(paymentUserId, 10);
        const paymentIdDuplicateCheck = await drizzleDb
          .select()
          .from(TransactionsSchema)
          .where(
            and(
              eq(TransactionsSchema.author_id, paymentUserIdInt),
              eq(TransactionsSchema.stripe_session_id, paymentIntent.id),
            ),
          )
          .limit(1);
        if (paymentIdDuplicateCheck.length) {
          console.log(
            "⚠️ Duplicate payment intent transaction found, skipping",
          );
          return;
        }

        await drizzleDb.transaction(async (trx) => {
          const amount = paymentIntent.amount / 100; // Amount in cents
          console.log("Processing payment intent amount:", amount);

          const userIdInt = parseInt(paymentUserId, 10);

          const accountResList = await trx.execute(
            sql`SELECT balance FROM ${AccountSchema} WHERE id = ${userIdInt} FOR UPDATE`,
          );

          const currentBalance = Number(accountResList[0]?.balance ?? 0);
          let newBalance = addWithPrecision(currentBalance, amount);

          if (accountResList.length) {
            await trx
              .update(AccountSchema)
              .set({
                balance: sql`${newBalance}`,
                updated_at: new Date().toISOString(),
              })
              .where(eq(AccountSchema.id, userIdInt));
          } else {
            await trx.insert(AccountSchema).values({
              id: userIdInt,
              balance: sql`${newBalance}`,
            });
          }

          await trx.insert(TransactionsSchema).values({
            id: nanoid(),
            author_id: userIdInt,
            amount: sql`${amount}`,
            stripe_session_id: paymentIntent.id,
            previous_balance: sql`${currentBalance}`,
            after_balance: sql`${newBalance}`,
            description: `Recharge via Stripe payment intent ${paymentIntent.id}`,
            transaction_type: TransactionType.RECHARGE,
            created_at: new Date().toISOString(),
          });
        });

        console.log("✅ payment_intent.succeeded processing completed");
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
        console.log("Event data:", JSON.stringify(event.data, null, 2));
    }
  } catch (error) {
    console.log("❌ Error processing webhook:", error);
    console.log(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
  }

  console.log("=== End Webhook Processing ===\n");
}
