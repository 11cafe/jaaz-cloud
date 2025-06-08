import NextAuth, { type AuthOptions, Session, User } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { UserInDB } from "@/server/dbTypes";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import { UserSchema } from "@/schema";
import { eq } from "drizzle-orm";

let githubClientId;
let githubClientSecret;

if (process.env.NODE_ENV === "production") {
  githubClientId = process.env.GITHUB_OAUTH_CLIENT_ID_NODECAFE;
  githubClientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET_NODECAFE;
} else {
  githubClientId = process.env.GITHUB_OAUTH_CLIENT_ID_LOCALHOST;
  githubClientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET_LOCALHOST;
}

const adminEmails = process.env.ADMIN_EMAILS?.split(",") ?? [];
const allowedEmailDomains =
  process.env.ALLOWED_EMAIL_DOMAINS?.split(",") ?? undefined;

export const authOptions: AuthOptions = {
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GithubProvider({
      clientId: githubClientId ?? "",
      clientSecret: githubClientSecret ?? "",
      authorization: {
        params: { scope: "read:user user:email" },
      },
      httpOptions: {
        timeout: 10000,
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name,
          email: profile.email,
          image: profile.avatar_url,
          login: profile.login,
          provider: "github",
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      let sub = account?.providerAccountId;
      if (!account?.providerAccountId || !user?.email) {
        return false;
      }
      const emailDomain = user.email.split("@")[1]?.trim();
      if (allowedEmailDomains && !allowedEmailDomains.includes(emailDomain)) {
        console.error("Email domain not allowed: ", emailDomain);
        const encodedMessage = encodeURIComponent(
          `Email domain not allowed: ${emailDomain}`,
        );
        return `/auth/signin?error=${encodedMessage}`;
      }
      sub = (account?.provider ? account.provider + "_" : "") + sub;
      try {
        const existingUsers = await drizzleDb
          .select()
          .from(UserSchema)
          .where(eq(UserSchema.oauth_sub, sub));
        let userInDb: UserInDB | null = existingUsers?.[0] ?? null;
        if (!userInDb) {
          // new user, create record
          let username = user.email.split("@")[0];
          let uniqueUser = false;
          for (let i = 0; i < 10; i++) {
            const existingUsername = await drizzleDb
              .select()
              .from(UserSchema)
              .where(eq(UserSchema.username, username));
            if (existingUsername && existingUsername.length === 0) {
              uniqueUser = true;
              break;
            }
            const twoDigitRandom = Math.floor(10 + Math.random() * 90);
            username = username + twoDigitRandom;
          }
          if (!uniqueUser) {
            console.error("Failed to create unique username", user.email);
            return `/auth/signin?error=${encodeURIComponent(
              `Cannot find unique username for ${user.email} please try again later.`,
            )}`;
          }

          userInDb =
            (await drizzleDb
              .insert(UserSchema)
              .values({
                email: user.email,
                username: username,
                image_url: user.image ?? null,
                provider: account?.provider ?? "",
                oauth_sub: sub,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              })
              .returning()
              .then((res) => res.at(0))) ?? null;
          if (!userInDb?.id) {
            console.error("Failed to create user in database", userInDb);
            return false;
          }
        }
        user.id = userInDb.id.toString();
        user.username = userInDb.username; // Add this line to include the username
      } catch (error) {
        console.error("Error saving user to database: ", error);
        return false;
      }
      return true;
    },
    async session({ session, token }): Promise<Session> {
      session.user.login = token.login as string;
      session.user.provider = token.provider as string;
      session.user.id = parseInt(token.id as string);
      session.user.username = token.username as string; // Add this line to include the username in the session
      session.user.balance = (token.balance as string) || "0.00";
      if (session.user.email) {
        session.user.isAdmin = adminEmails.includes(session.user.email);
      }
      return session;
    },
    async jwt({ token, user, account, trigger, session }) {
      // account looks like: {
      //   provider: 'github',
      //   type: 'oauth',
      //   providerAccountId: '1835534',
      //   access_token: 'gho_QSigBF4R91U8FZ',
      //   scope: 'read:user,user:email'
      // }
      // user is the same as profile() return value
      if (trigger === "update") {
        // session is the data sent from the client in the update() function above
        // Note, that `session` can be any arbitrary object, remember to validate it!
        if (typeof session.username === "string") {
          token.username = session.username;
        }

        if (typeof session.balance === "string") {
          token.balance = session.balance;
        }
      }
      if (account) {
        token.provider = account.provider;
      }
      if (user) {
        token.id = user.id;
        token.login = user.login;
        token.username = user.username; // Add this line to include the username in the JWT
      }
      return token;
    },
  },
};
export default NextAuth(authOptions);
