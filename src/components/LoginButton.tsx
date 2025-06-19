import { ErrorBoundary } from "react-error-boundary";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  IconUser,
  IconCreditCard,
  IconLogout,
  IconChevronDown
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function LoginButton() {
  const { data: session } = useSession();

  if (session?.user) {
    const profileImage = session.user?.image;
    const username = session.user.username || session.user.name || "用户";
    const userInitial = username.charAt(0).toUpperCase();

    return (
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 px-3 hover:bg-accent"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={profileImage || "/assets/user_placeholder.png"} alt={username} />
                <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block text-sm font-medium">
                {username}
              </span>
              <IconChevronDown size={14} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-full">

            {/* <DropdownMenuItem
              onClick={() => {
                // TODO: Implement profile page or edit profile dialog
                console.log("Profile feature coming soon");
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <IconUser size={16} />
              <span>个人资料</span>
            </DropdownMenuItem> */}

            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center gap-2 cursor-pointer">
                <IconCreditCard size={16} />
                <span>我的账单</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut()}
              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <IconLogout size={16} />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ErrorBoundary>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => signIn()}>
      登录
    </Button>
  );
}
