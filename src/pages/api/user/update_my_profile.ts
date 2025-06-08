// import type { NextApiRequest, NextApiResponse } from "next";

// import { ApiResponse } from "@/types/ApiTypes";
// import { ComfyUser } from "@/server/dbTypes";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../auth/[...nextauth]";
// import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
// import { UserSchema } from "@/schema";
// import { eq } from "drizzle-orm";

// function isValidString(str: string) {
//   const regex = /^[A-Za-z0-9_-]+$/;
//   return regex.test(str);
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<ApiResponse<ComfyUser | null>>,
// ) {
//   try {
//     const session = await getServerSession(req, res, authOptions);
//     if (!session) {
//       res.status(401).json({ error: "Unauthorized" });
//       return;
//     }

//     const updateData = req.body;
//     const username = updateData.username;
//     if (!username?.length) {
//       res.status(400).json({ error: "Username cannot be empty" });
//       return;
//     }
//     if (!isValidString(username)) {
//       res.status(400).json({
//         error:
//           "Username can only contain letters, numbers, underscores(_), and hyphens(-).",
//       });
//       return;
//     }
//     const existing = await drizzleDb
//       .select()
//       .from(UserSchema)
//       .where(eq(UserSchema.username, username));
//     if (existing.length > 0 && existing[0].id !== session.user.id) {
//       res.status(400).json({
//         error: "Username already exists. Change to something unique.",
//       });
//       return;
//     }
//     const user = await dbTables.user.update(
//       session.user.id,
//       {
//         username: username,
//         intro: updateData.intro,
//       },
//       session.user,
//     );

//     res.status(200).json({
//       data: user ?? null,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch data" });
//   }
// }
