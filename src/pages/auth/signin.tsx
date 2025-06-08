import { signIn, useSession } from "next-auth/react";
import LoginFormButtons from "@/components/auth/LoginFormButtons";
import { useRouter } from "next/router";

export default function SignIn({}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { error } = router.query;
  const errorMessage = error ? decodeURIComponent(error as string) : "";
  const callbackUrl = router.query.callbackUrl as string;

  if (session) {
    const emailUsername = session.user?.email?.split("@")?.at(0);
    return (
      <div>
        <span>
          Already logged in as <b>{emailUsername}</b>
        </span>
      </div>
    );
  }

  return (
    <div>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      <LoginFormButtons
        onClickGoogle={() => signIn("google", { callbackUrl })}
        onClickGithub={() => signIn("github", { callbackUrl })}
      />
    </div>
  );
}

// export async function getServerSideProps(context: GetServerSidePropsContext) {
//   const session = await getSession(context);

//   if (session) {
//     return {
//       redirect: {
//         destination: (context?.query?.callbackUrl as string) || "/",
//         permanent: false,
//       },
//     };
//   }
//   return {
//     props: {},
//   };
// }
