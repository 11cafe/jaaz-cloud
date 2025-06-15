import { signIn, useSession } from "next-auth/react";
import LoginFormButtons from "@/components/auth/LoginFormButtons";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

function SignIn({ }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { error } = router.query;
  const errorMessage = error ? decodeURIComponent(error as string) : "";
  const callbackUrl = router.query.callbackUrl as string;

  if (session) {
    const emailUsername = session.user?.email?.split("@")?.at(0);
    return (
      <div className="flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">已登录</h2>
                <p className="text-muted-foreground">
                  当前用户: <span className="font-medium text-primary">{emailUsername}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-[40vw] flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg"
            >
              <svg className="w-10 h-10 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </motion.div>
            <CardTitle className="text-2xl font-bold mb-2">
              欢迎使用 Jaaz
            </CardTitle>
            <CardDescription className="text-base">
              请登录以继续使用 AI 设计助手
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-destructive mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-destructive text-sm">{errorMessage}</p>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LoginFormButtons
                onClickGoogle={() => signIn("google", { callbackUrl })}
              />
            </motion.div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 bg-muted rounded-full border">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-muted-foreground text-sm">安全登录</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Add noLayout property to prevent wrapping in default layout
// SignIn.noLayout = true;

export default SignIn;

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
