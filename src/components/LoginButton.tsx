import { ErrorBoundary } from "react-error-boundary";
import { useSession, signIn, signOut } from "next-auth/react";
import CustomMenu from "./CustomMenu";
import { IconTriangleInvertedFilled } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Flex } from "./ui/Flex";

const PROFILE_IMAGE_SIZE = 20;
export default function LoginButton() {
  const { data: session } = useSession();
  if (session?.user) {
    const profileImage = session.user?.image;
    return (
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Flex className="gap-1">
          <div className="flex items-center gap-1">
            {profileImage ? (
              <img className="w-5 h-5 rounded-full" src={profileImage} alt="" />
            ) : (
              <img
                className="w-5 h-5 rounded-full"
                src="/assets/user_placeholder.png"
                alt=""
              />
            )}
            <span>{session.user.username}</span>
          </div>
          <CustomMenu
            menuButton={
              <Button variant={"outline"} size={"sm"}>
                <IconTriangleInvertedFilled size={8} />
              </Button>
            }
            menuContent={
              <div style={{ width: "100px" }}>
                <Button
                  variant={"ghost"}
                  onClick={(e) => {
                    e.preventDefault();
                    signOut();
                  }}
                  className="w-full"
                >
                  Log out
                </Button>
              </div>
            }
          />
        </Flex>
      </ErrorBoundary>
    );
  }
  return (
    <>
      <Button size={"sm"} variant={"ghost"} onClick={() => signIn()}>
        Login
      </Button>
    </>
  );
}
