import { Button } from "@/components/ui/button";
import { IconBrandGithub, IconBrandGoogleFilled } from "@tabler/icons-react";

const BUTTON_WIDTH = "300px";

export default function LoginFormButtons({
  onClickGithub,
  onClickGoogle,
}: {
  onClickGoogle: () => void;
  onClickGithub: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        key={"google"}
        onClick={onClickGoogle}
        className="bg-[#CC5541] text-white w-[300px]"
      >
        <IconBrandGoogleFilled size={20} />
        Continue with Google
      </Button>

      {/* <Button
        key={"github"}
        onClick={onClickGithub}
        className="bg-[#333] text-white w-[300px]"
      >
        <IconBrandGithub size={20} />
        Continue with Github
      </Button> */}
    </div>
  );
}
