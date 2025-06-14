import { TransactionType } from "@/schema";
import { UPDATE_BALANCE_CUSTOM_EVENT } from "./consts";
import { validateAmount } from "./mathUtils";

/**
 * A unified consumption function is used to update the balance data in the head navigation bar after successful consumption.
 */
export const handleConsume = async (
  amount: number,
  transactionType: TransactionType,
  description?: string,
): Promise<{ success: boolean; error?: string }> => {
  const validation = validateAmount(amount);
  if (validation.valid) {
    const res = await fetch("/api/billing/consume", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        transactionType,
        description,
      }),
    });

    const response = await res.json();
    if (response.success) {
      window.dispatchEvent(new CustomEvent(UPDATE_BALANCE_CUSTOM_EVENT));
    }
    return response;
  } else {
    return {
      success: false,
      error: validation.error || "Invalid amount.",
    };
  }
};
