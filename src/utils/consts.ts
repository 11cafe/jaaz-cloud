import { SessionUser } from "next-auth";

export const UPDATE_BALANCE_CUSTOM_EVENT = "UPDATE_BALANCE";

export type UpdateBalanceCustomEvent = {
  type: typeof UPDATE_BALANCE_CUSTOM_EVENT;
};
