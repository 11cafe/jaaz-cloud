// import type { NextApiRequest, NextApiResponse } from "next";

// import { ApiResponse } from "@/types/ApiTypes";
// import { ComfyUser } from "@/server/dbTypes";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<ApiResponse<ComfyUser | null>>,
// ) {
//   try {
//     const id = req.query.id as string;
//     const user = await dbTables.user?.get(id, null);

//     res.status(200).json({
//       data: user ?? null,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch data" });
//   }
// }
