// 充值金额限制配置
export const RECHARGE_LIMITS = {
  MIN_AMOUNT: 1, // 最小充值金额 $1
  MAX_AMOUNT: 1000, // 最大充值金额 $1,000
};

/**
 * 验证充值金额是否在合理范围内
 */
export function validateRechargeAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: "Amount must be a positive number" };
  }

  if (amount < RECHARGE_LIMITS.MIN_AMOUNT) {
    return {
      valid: false,
      error: `Minimum recharge amount is $${RECHARGE_LIMITS.MIN_AMOUNT}`,
    };
  }

  if (amount > RECHARGE_LIMITS.MAX_AMOUNT) {
    return {
      valid: false,
      error: `Maximum recharge amount is $${RECHARGE_LIMITS.MAX_AMOUNT}`,
    };
  }

  // 检查是否最多8位小数
  const factor = Math.pow(10, 8);
  if (Math.floor(amount * factor) !== amount * factor) {
    return {
      valid: false,
      error: "Amount must have at most 8 decimal places",
    };
  }

  return { valid: true };
}
