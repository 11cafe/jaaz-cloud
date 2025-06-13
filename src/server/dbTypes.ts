import { UserSchema } from "@/schema";
import { DeviceAuthRequestSchema } from "@/schema";

export type UserInDB = typeof UserSchema.$inferSelect;
// export type ApiKey = typeof ApiKeySchema.$inferSelect;
export type DeviceAuthRequestInDB = typeof DeviceAuthRequestSchema.$inferSelect;
