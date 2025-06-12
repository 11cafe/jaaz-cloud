import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function DeviceLoginPage() {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!code) {
      setMessage("❌ 缺少 code 参数");
      return;
    }
    if (session && !submitting) {
      setSubmitting(true);
      // 登录后，调用 API 绑定 code
      fetch("/api/device/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, user: session.user }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setMessage("✅ 登录成功，可以关闭本页面");
          } else {
            const errorMsg = data.error || "未知错误";
            console.log("Authorization failed at:", new Date().toISOString(), "Error:", errorMsg);
            setMessage("❌ 授权失败: " + errorMsg);
          }
        })
        .catch(() => {
          console.log("Authorization request failed at:", new Date().toISOString());
          setMessage("❌ 授权请求失败");
        });
    }
  }, [session, code, submitting]);

  return (
    <div style={{ padding: 32 }}>
      <h2>设备登录</h2>
      {message && <p>{message}</p>}
      {!session && code && (
        <>
          <p>请点击下方按钮完成登录：</p>
          <button
            style={{ padding: 12, fontSize: 16, marginTop: 16 }}
            onClick={() => signIn()}
          >
            使用账号登录
          </button>
        </>
      )}
    </div>
  );
}
