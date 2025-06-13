import { UserSchema } from "@/schema";
import { DeviceAuthRequestSchema } from "@/schema";

export type UserInDB = typeof UserSchema.$inferSelect;
// export type ApiKey = typeof ApiKeySchema.$inferSelect;
export type DeviceAuthRequestInDB = typeof DeviceAuthRequestSchema.$inferSelect;

export interface Transaction {
  id: string;
  author_id: number;
  amount: string;
  stripe_session_id?: string;
  transaction_type: string;
  created_at: string;
  previous_balance: string;
  after_balance: string;
  description?: string;
}

export interface Account {
  id: number;
  balance: string;
  updatedAt: string;
}
