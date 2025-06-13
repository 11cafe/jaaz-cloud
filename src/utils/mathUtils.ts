/**
 * 精确加法运算，避免浮点数精度问题
 */
export function addWithPrecision(a: number, b: number): number {
  const factor = Math.pow(10, 2); // 保留2位小数
  return Math.round((a + b) * factor) / factor;
}

/**
 * 精确减法运算，避免浮点数精度问题
 */
export function subtractWithPrecision(a: number, b: number): number {
  const factor = Math.pow(10, 2); // 保留2位小数
  return Math.round((a - b) * factor) / factor;
}
