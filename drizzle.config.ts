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
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: true,
  },
  verbose: true,
  strict: true,
});
