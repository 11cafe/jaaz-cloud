import { defineConfig } from "drizzle-kit";

// Load environment variables based on NODE_ENV
const isDev = process.env.NODE_ENV !== "production";

// In development, try to load from .env.local, .env.development, then .env
if (isDev) {
  try {
    require("dotenv").config({ path: ".env.local" });
  } catch {
    try {
      require("dotenv").config({ path: ".env.development" });
    } catch {
      require("dotenv").config();
    }
  }
} else {
  // In production, load from .env.production or .env
  try {
    require("dotenv").config({ path: ".env.production" });
  } catch {
    require("dotenv").config();
  }
}

export default defineConfig({
  schema: ["./src/schema/index.ts", "./src/schema/project.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "jaaz-dev.ct2ycywmm764.ap-northeast-1.rds.amazonaws.com",
    port: 5432,
    user: "postgres",
    password: "jaaz_581321",
    database: "jaaz-dev",
    ssl: {
      rejectUnauthorized: false,
    },
  },

  verbose: true,
  strict: true,
});
