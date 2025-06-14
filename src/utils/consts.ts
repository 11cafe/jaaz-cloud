import { SessionUser } from "next-auth";

export const UPDATE_BALANCE_CUSTOM_EVENT = "UPDATE_BALANCE";
export const defaultPageSize = 10;

export type UpdateBalanceCustomEvent = {
  type: typeof UPDATE_BALANCE_CUSTOM_EVENT;
};
