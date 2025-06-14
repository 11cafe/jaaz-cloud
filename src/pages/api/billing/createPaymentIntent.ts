import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";

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

  const { amount } = req.body;
  if (!amount || amount < 1) {
    res.status(400).json({ error: "Invalid amount. Minimum amount is $1." });
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

  // Authenticate the request
  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return; // authenticateRequest already sent error response
  }

  const { userId } = authResult;

  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: "usd",
      metadata: {
        userId: userId.toString(),
        type: "recharge",
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating PaymentIntent:", error);
    res.status(500).json({
      error: `Failed to create payment intent: ${error}`,
    });
  }
}
