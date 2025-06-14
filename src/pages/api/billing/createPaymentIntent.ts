import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * 步骤2：创建支付意图API（嵌入式支付模式）
 *
 * 嵌入式支付流程中的关键步骤：
 * 1. 前端StripeCheckout组件初始化时调用此API
 * 2. 验证用户身份和请求参数
 * 3. 创建Stripe支付意图（PaymentIntent）
 * 4. 返回客户端密钥给前端用于初始化Stripe Elements
 * 5. 前端使用客户端密钥渲染支付表单
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
  if (!amount || amount < 1) {
    res.status(400).json({ error: "Invalid amount. Minimum amount is $1." });
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
  const authResult = await authenticateRequest(req, res);
  if (!authResult) {
    return; // authenticateRequest已发送错误响应
  }

  const { userId } = authResult;

  try {
    // 步骤2：创建支付意图
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // 金额转换为分（Stripe要求）
      currency: "usd", // 货币类型

      // 元数据：用于后续处理时识别用户和交易类型
      metadata: {
        userId: userId.toString(), // 用户ID
        type: "recharge", // 交易类型：充值
      },

      // 启用自动支付方式（支持多种支付方式）
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // 返回客户端密钥给前端
    // 客户端密钥用于在前端安全地初始化Stripe Elements
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    // 错误处理
    console.error("Error creating PaymentIntent:", error);
    res.status(500).json({
      error: `Failed to create payment intent: ${error}`,
    });
  }
}
