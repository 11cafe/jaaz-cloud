import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export const pgsql = postgres(process.env.DATABASE_URL!, {
  ssl: "prefer",
  max: 20,
  idle_timeout: 20,
});
export const drizzleDb = drizzle(pgsql);
