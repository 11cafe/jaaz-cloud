import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ERechargePaymentState } from "@/consts/types";
import { validateRechargeAmount } from "@/utils/billingUtil";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * 步骤1a：创建Stripe结账会话API（重定向支付模式）
 *
 * 重定向支付流程：
 * 1. 用户在前端选择充值金额并点击确认
 * 2. 前端调用此API创建Stripe结账会话
 * 3. 返回Stripe托管的结账页面URL
 * 4. 前端重定向用户到Stripe结账页面
 * 5. 用户在Stripe页面完成支付
 * 6. Stripe重定向用户回到应用（带支付状态参数）
 * 7. Webhook处理支付成功事件并更新数据库
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 只允许POST请求
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  // 验证请求参数：充值金额
  const { amount } = req.body;

  // 使用统一的金额验证函数
  const amountValidation = validateRechargeAmount(amount);
  if (!amountValidation.valid) {
    res.status(400).json({ error: amountValidation.error });
    return;
  }

  // 检查Stripe配置
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({
      error:
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
    });
    return;
  }

  // 验证用户身份认证
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    res.status(401).json({ error: "Unauthorized! Please login." });
    return;
  }

  try {
    // 步骤1a：创建Stripe结账会话
    const checkoutSession = await stripe.checkout.sessions.create({
      // 商品信息配置
      line_items: [
        {
          price_data: {
            currency: "usd", // 货币类型
            product_data: {
              name: "Recharge Nodecafe Account", // 商品名称
            },
            unit_amount: amount * 100, // 金额（以分为单位）
          },
          quantity: 1, // 数量
        },
      ],
      mode: "payment", // 支付模式（一次性支付）

      // 元数据：用于Webhook识别用户
      metadata: {
        userId: session.user.id, // 当Webhook成功处理支付时，会更新对应用户的账户余额
      },

      // 支付成功后的重定向URL
      success_url: `${req.headers.origin}/billing?paymentState=${ERechargePaymentState.SUCCESS}&sessionId={CHECKOUT_SESSION_ID}`,

      // 支付取消后的重定向URL
      cancel_url: `${req.headers.origin}/billing?paymentState=${ERechargePaymentState.CANCEL}`,
    });

    // 返回结账会话URL给前端
    res.status(200).json({ success: true, url: checkoutSession.url });
  } catch (err) {
    // 错误处理
    const { statusCode, message } = res as unknown as {
      statusCode: number;
      message: string;
    };
    res.status(statusCode || 500).json({
      error: `Failed to create checkout session, because ${message ?? err}`,
    });
  }
}
