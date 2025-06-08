// import type { NextApiRequest, NextApiResponse } from "next";
// import { ComfyUser } from "@/server/dbTypes";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../auth/[...nextauth]";
// import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
// import { AccountSchema, UserSchema } from "@/schema";
// import { eq } from "drizzle-orm";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<(ComfyUser & { balance: string }) | null>,
// ) {
//   try {
//     const session = await getServerSession(req, res, authOptions);
//     if (!session) {
//       res.status(401).json(null);
//       return;
//     }

//     const [existing] = await drizzleDb
//       .select()
//       .from(UserSchema)
//       .leftJoin(AccountSchema, eq(UserSchema.id, AccountSchema.id))
//       .where(eq(UserSchema.id, session.user.id));

//     return res.status(200).json({
//       ...existing?.user,
//       balance: existing?.account?.balance ?? "0",
//     });
//   } catch (error) {
//     res.status(500).json(null);
//   }
// }
