// import { IconCopy } from "@tabler/icons-react";
// import { GetServerSideProps, InferGetServerSidePropsType } from "next";
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "../api/auth/[...nextauth]";
// import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
// import { ApiKeySchema } from "@/schema";
// import { and, eq } from "drizzle-orm";
// import { nanoid } from "nanoid";
// import Head from "next/head";

// export const getServerSideProps = (async ({ params, req, res, query }) => {
//   const session = await getServerSession(req, res, authOptions);
//   if (!session) {
//     return {
//       redirect: {
//         destination:
//           "/auth/signin?callbackUrl=" + encodeURIComponent("/auth/shareKey"),
//         permanent: false,
//       },
//     };
//   }
//   const rows = await drizzleDb
//     .select()
//     .from(ApiKeySchema)
//     .where(
//       and(
//         eq(ApiKeySchema.user_id, session.user.id),
//         eq(ApiKeySchema.scope, "local_share"),
//       ),
//     );
//   let userkey = rows.at(0) ?? null;
//   if (!userkey) {
//     const key = nanoid(40);
//     userkey =
//       (await drizzleDb
//         .insert(ApiKeySchema)
//         .values({
//           id: key,
//           user_id: session.user.id,
//           scope: "local_share",
//           updated_at: new Date().toISOString(),
//           created_at: new Date().toISOString(),
//         })
//         .returning()
//         .then((res) => res.at(0))) ?? null;
//   }

//   return {
//     props: {
//       userkey: userkey,
//     },
//   };
// }) satisfies GetServerSideProps;

// export default function Page(
//   props: InferGetServerSidePropsType<typeof getServerSideProps>,
// ) {
//   const toast = useToast();
//   const shareKey = props.userkey?.id;

//   if (!shareKey) {
//     return (
//       <Alert title="Error" status="error">
//         <p>Failed to create share key, please try again later</p>
//       </Alert>
//     );
//   }

//   const onCopy = () => {
//     navigator.clipboard.writeText(shareKey);
//     toast({
//       title: "Copied to clipboard",
//       status: "success",
//       duration: 5000,
//     });
//   };

//   return (
//     <Stack flex={1} textAlign={"center"}>
//       <Head>
//         <title>API Key - CodeCafe</title>
//       </Head>
//       <h1>Your API key</h1>
//       <p style={{ marginBottom: 5 }}>
//         Copy this key back to your workspace manager
//       </p>
//       <Flex alignItems={"center"} gap={1} justifyContent={"center"}>
//         <pre
//           style={{
//             padding: "5px 10px",
//             backgroundColor: "#333",
//             borderRadius: 4,
//           }}
//         >
//           {shareKey}
//         </pre>
//         <IconButton icon={<IconCopy />} aria-label="Copy" onClick={onCopy} />
//       </Flex>
//     </Stack>
//   );
// }
