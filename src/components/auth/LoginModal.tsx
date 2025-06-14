import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import LoginFormButtons from "./LoginFormButtons";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

function LoginModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      onClose();
    }
  }, [session]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <LoginFormButtons
            onClickGoogle={() => {
              window.open(
                "/auth/signinProvider?provider=google",
                "Login",
                "width=800,height=600",
              );
            }}
            onClickGithub={() => {
              window.open(
                "/auth/signinProvider?provider=github",
                "Login",
                "width=800,height=600",
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LoginModal;
