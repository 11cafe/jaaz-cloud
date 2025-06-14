/**
 * 精确加法运算，避免浮点数精度问题
 */
export function addWithPrecision(a: number, b: number): number {
  const factor = Math.pow(10, 8); // 保留8位小数
  return Math.round((a + b) * factor) / factor;
}

/**
 * 精确减法运算，避免浮点数精度问题
 */
export function subtractWithPrecision(a: number, b: number): number {
  const factor = Math.pow(10, 8); // 保留8位小数
  return Math.round((a - b) * factor) / factor;
}

/**
 * 检查金额是否有效（大于0且最多8位小数）
 */
export function validateAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: "Amount must be a positive number." };
  }

  // 检查是否最多8位小数
  const factor = Math.pow(10, 8);
  if (Math.floor(amount * factor) !== amount * factor) {
    return {
      valid: false,
      error: "Amount must have at most 8 decimal places.",
    };
  }

  return { valid: true };
}
