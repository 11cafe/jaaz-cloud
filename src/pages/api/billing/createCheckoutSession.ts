import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ERechargePaymentState } from "@/consts/types";

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
  if (!amount) {
    res.status(400).json({ error: "The amount should not be null." });
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
