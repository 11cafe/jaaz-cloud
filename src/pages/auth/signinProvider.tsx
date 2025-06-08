import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Page() {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { error } = router.query;
  const errorMessage = error ? decodeURIComponent(error as string) : "";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get("provider");
    if (!provider) {
      setMessage("❌ No provider specified");
      return;
    }
    if (session) {
      const emailUsername = session.user?.email?.split("@")?.at(0);
      setMessage(
        "✅ Already logged in as " + (session.user?.name ?? emailUsername),
      );
      window.close();
      return;
    }
    if (provider === "github") {
      setMessage("⏳ Signing in with GitHub...");
      signIn("github");
      return;
    }
    if (provider === "google") {
      setMessage("⏳ Signing in with Google...");
      signIn("google");
      return;
    }
  }, [session]);

  return (
    <div>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {message && <p>{message}</p>}
    </div>
  );
}
