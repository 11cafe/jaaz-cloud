import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ERechargePaymentState } from "@/consts/types";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    res.status(401).json({ error: "Unauthorized! Please loggin." });
    return;
  }
  if (req.method === "POST") {
    const { amount } = req.body;
    if (!amount) {
      res.status(400).json({ error: "The amount hould not be null." });
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
        error: `"Failed to create checkout session, because ${message ?? err}`,
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
