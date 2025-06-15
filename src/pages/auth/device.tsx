import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function DeviceLoginPage() {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "waiting">("waiting");
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!code) {
      setMessage("缺少 code 参数");
      setStatus("error");
      return;
    }
    if (session && !submitting) {
      setSubmitting(true);
      setStatus("loading");
      // 登录后，调用 API 绑定 code
      fetch("/api/device/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, user: session.user }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMessage("登录成功，可以关闭本页面");
            setStatus("success");
          } else {
            const errorMsg = data.error || "未知错误";
            console.log("Authorization failed at:", new Date().toISOString(), "Error:", errorMsg);
            setMessage("授权失败: " + errorMsg);
            setStatus("error");
          }
        })
        .catch(() => {
          console.log("Authorization request failed at:", new Date().toISOString());
          setMessage("授权请求失败");
          setStatus("error");
        });
    }
  }, [session, code, submitting]);

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "loading":
        return (
          <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-destructive";
      case "loading":
        return "bg-primary animate-pulse";
      default:
        return "bg-primary";
    }
  };

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
              className={`w-20 h-20 ${getStatusColor()} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg`}
            >
              {getStatusIcon()}
            </motion.div>
            <CardTitle className="text-2xl font-bold mb-2">
              设备登录
            </CardTitle>
            <CardDescription className="text-base">
              {!session && code ? "请完成登录以授权设备" : "正在处理设备授权"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {message && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`mb-6 p-4 rounded-lg border ${status === "success"
                  ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                  : status === "error"
                    ? "bg-destructive/10 border-destructive/20"
                    : "bg-muted border-border"
                  }`}
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {status === "success" && (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {status === "error" && (
                      <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {status === "loading" && (
                      <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </div>
                  <p className={`text-sm ${status === "success"
                    ? "text-green-700 dark:text-green-300"
                    : status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                    }`}>
                    {message}
                  </p>
                </div>
              </motion.div>
            )}

            {!session && code && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <Button
                  onClick={() => signIn()}
                  className="w-full h-12 text-base font-medium"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  使用账号登录
                </Button>
              </motion.div>
            )}

            {status === "loading" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="inline-flex items-center px-4 py-2 bg-muted rounded-full border">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                  <span className="text-muted-foreground text-sm">正在授权设备...</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 bg-muted rounded-full border">
            <div className={`w-2 h-2 rounded-full mr-2 ${status === "success" ? "bg-green-500" :
              status === "error" ? "bg-destructive" :
                "bg-primary animate-pulse"
              }`}></div>
            <span className="text-muted-foreground text-sm">
              {status === "success" ? "授权完成" :
                status === "error" ? "授权失败" :
                  "安全授权"}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
