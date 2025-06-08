/**
 * Adds two numbers with precision handling.
 * @param a - The first number.
 * @param b - The second number.
 * @param factor - The precision factor (e.g., 100 for two decimal places).
 * @returns The sum of a and b with specified decimal precision.
 */
export const addWithPrecision = (
  a: number,
  b: number,
  factor: number = 100,
): number => (Math.round(a * factor) + Math.round(b * factor)) / factor;

/**
 * Subtracts one number from another with precision handling.
 * @param a - The first number.
 * @param b - The second number.
 * @param factor - The precision factor (e.g., 100 for two decimal places).
 * @returns The result of a - b with specified decimal precision.
 */
export const subtractWithPrecision = (
  a: number,
  b: number,
  factor: number = 100,
): number => (Math.round(a * factor) - Math.round(b * factor)) / factor;
