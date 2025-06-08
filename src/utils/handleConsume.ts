import { TransactionType } from "@/schema";
import { UPDATE_BALANCE_CUSTOM_EVENT } from "./consts";

const isTwoDecimalPlaces = (num: number) =>
  Number.isFinite(num) && Math.floor(num * 100) === num * 100;

/**
 * A unified consumption function is used to update the balance data in the head navigation bar after successful consumption.
 */
export const handleConsume = async (
  amount: number,
  transactionType: TransactionType,
  description?: string,
): Promise<{ success: boolean; error?: string }> => {
  if (isTwoDecimalPlaces(amount)) {
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
      error:
        "The input number must be a number with at most two decimal places.",
    };
  }
};
