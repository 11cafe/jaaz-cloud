import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@chakra-ui/react";

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
    <>
      <Modal isOpen={true} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Login</ModalHeader>
          <ModalBody>
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
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

export default LoginModal;
