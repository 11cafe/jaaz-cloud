import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateRequest } from "@/utils/auth";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { AccountSchema, TransactionsSchema, TransactionType } from "@/schema";
import { eq, sql, and } from "drizzle-orm";
import { addWithPrecision } from "@/utils/mathUtils";
import { nanoid } from "nanoid";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * 步骤4-5：检查支付状态并更新数据库API（嵌入式支付模式）
 *
 * 支付状态检查和处理流程：
 * 1. 前端支付确认后轮询调用此API检查支付状态
 * 2. 验证用户身份和请求参数
 * 3. 检查数据库中是否已处理过此支付（防重复处理）
 * 4. 从Stripe获取支付意图的最新状态
 * 5. 如果支付成功，更新用户余额和创建交易记录
 * 6. 返回支付状态给前端
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

  // 验证请求参数：支付意图ID
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    res.status(400).json({ error: "Payment Intent ID is required" });
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
    return;
  }

  const { userId } = authResult;

  try {
    // 步骤4a：检查此支付是否已经处理过（防重复处理）
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
      // 支付已处理过，直接返回
      res.status(200).json({
        status: "already_processed",
        message: "Payment has already been processed",
      });
      return;
    }

    // 步骤4b：从Stripe获取支付意图的最新状态
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // 步骤5：支付成功，处理数据库更新
      await drizzleDb.transaction(async (trx) => {
        const amount = paymentIntent.amount / 100; // 从分转换为元

        // 步骤5a：获取用户当前余额（使用行锁防止并发问题）
        const accountResList = await trx.execute(
          sql`SELECT balance FROM ${AccountSchema} WHERE id = ${userId} FOR UPDATE`,
        );

        const currentBalance = Number(accountResList[0]?.balance ?? 0);
        const newBalance = addWithPrecision(currentBalance, amount);

        // 步骤5b：更新用户余额
        if (accountResList.length) {
          // 用户账户已存在，更新余额
          await trx
            .update(AccountSchema)
            .set({
              balance: sql`${newBalance}`,
            })
            .where(eq(AccountSchema.id, userId));
        } else {
          // 用户账户不存在，创建新账户
          await trx.insert(AccountSchema).values({
            id: userId,
            balance: sql`${newBalance}`,
          });
        }

        // 步骤5c：创建交易记录
        await trx.insert(TransactionsSchema).values({
          id: nanoid(), // 生成唯一交易ID
          author_id: userId, // 用户ID
          amount: sql`${amount}`, // 交易金额
          stripe_session_id: paymentIntentId, // Stripe支付意图ID
          previous_balance: sql`${currentBalance}`, // 交易前余额
          after_balance: sql`${newBalance}`, // 交易后余额
          description: TransactionType.RECHARGE, // 交易描述
          transaction_type: TransactionType.RECHARGE, // 交易类型：充值
          created_at: new Date().toISOString(), // 创建时间
        });
      });

      // 返回成功状态
      res.status(200).json({
        status: "succeeded",
        message: "Payment processed successfully",
      });
    } else {
      // 支付未成功，返回当前状态
      res.status(200).json({
        status: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`,
      });
    }
  } catch (error) {
    // 错误处理
    console.error("Error checking payment status:", error);
    res.status(500).json({
      error: `Failed to check payment status: ${error}`,
    });
  }
}
