import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import jwt from "jsonwebtoken";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { UserSchema } from "@/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "dev-secret";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

// Helper function to verify JWT token and get user info
async function verifyTokenAndGetUser(token: string): Promise<AuthUser | null> {
  try {
    // Log token info for debugging (only first and last few characters for security)
    console.log(
      "Verifying token:",
      token.substring(0, 10) + "..." + token.substring(token.length - 10),
    );

    // Check if token looks like a valid JWT (should have 3 parts separated by dots)
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      console.error(
        "Invalid JWT format: token should have 3 parts separated by dots, got",
        tokenParts.length,
        "parts",
      );
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log("Token decoded successfully:", {
      id: decoded.id,
      email: decoded.email,
    });

    if (!decoded.id) {
      console.error("Token missing user ID");
      return null;
    }

    // Query user from database to get latest info
    const userRows = await drizzleDb
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, decoded.id));

    const user = userRows[0];
    if (!user) {
      console.error("User not found in database for ID:", decoded.id);
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("JWT verification failed:", error.message);
    } else {
      console.error("Token verification failed:", error);
    }
    return null;
  }
}

export interface AuthResult {
  userId: number;
  username: string;
}

/**
 * Unified authentication function for API endpoints
 * Supports both Bearer token and session cookie authentication
 */
export async function authenticateRequest(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthResult | null> {
  const isDev = process.env.NODE_ENV === "development";
  let userId: number | null = null;
  let username = "anonymous";

  // First, try Bearer token authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim(); // Remove "Bearer " prefix and trim whitespace

    if (!token) {
      console.error("Empty token after Bearer prefix");
      res.status(401).json({ error: "Empty token provided" });
      return null;
    }

    console.log("Attempting Bearer token authentication");
    const user = await verifyTokenAndGetUser(token);

    if (user) {
      userId = user.id;
      username = user.username || user.email || "user";
      console.log(
        `Authenticated via Bearer token: ${username} (ID: ${userId})`,
      );
    } else {
      res.status(401).json({ error: "Invalid or expired token" });
      return null;
    }
  } else {
    // Fallback to session cookie authentication
    if (isDev) {
      // In development, create a mock dev session if no real session exists
      try {
        const session = await getServerSession(req, res, authOptions);
        if (session?.user?.id) {
          userId = session.user.id;
          username = session.user.username || session.user.email || "user";
        } else {
          // Mock dev user
          userId = 999999;
          username = "dev-user";
          console.log("Using mock dev session");
        }
      } catch (error) {
        // Fallback to mock dev user if session check fails
        userId = 999999;
        username = "dev-user";
        console.log("Session check failed, using mock dev session");
      }
    } else {
      // In production, require real authentication
      try {
        const session = await getServerSession(req, res, authOptions);
        if (!session?.user?.id) {
          res.status(401).json({ error: "Authentication required" });
          return null;
        }
        userId = session.user.id;
        username = session.user.username || session.user.email || "user";
      } catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ error: "Authentication failed" });
        return null;
      }
    }
  }

  return { userId: userId!, username };
}
