import { UserSchema } from "@/schema";

export type UserInDB = typeof UserSchema.$inferSelect;
// export type ApiKey = typeof ApiKeySchema.$inferSelect;
