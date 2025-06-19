import LoginButton from "./LoginButton";
import LanguageSwitcher from "./common/LanguageSwitcher";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
// import BalanceButton from "./balanceButton";
import { IconKey, IconServerBolt, IconWand, IconPhoto } from "@tabler/icons-react";
import { Badge } from "./ui/badge";

const navigation: Array<{ name: string; href: string; target?: "_blank" }> = [
  {
    name: "生成",
    href: "/generate",
  },
  {
    name: "广场",
    href: "/gallery",
  },
  // {
  //   name: "Github",
  //   href: "https://github.com/11cafe/jaaz",
  //   target: "_blank",
  // },
];

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const curPath = router.pathname;

  return (
    <header className="w-full">
      <nav aria-label="Global">
        <div className="flex justify-between flex-grow px-2 md:px-3 lg:px-14 py-2 md:py-3 lg:py-4 flex-wrap w-full">
          <div className="flex gap-2 md:gap-2 lg:gap-18 flex-wrap">
            <Link href="/" className="flex flex-row">
              <div className="flex items-center gap-2">
                <img
                  width={26}
                  height={26}
                  aria-label="comfyspace-logo"
                  src={"../../favicon.ico"}
                  alt=""
                />
                <span className="font-bold text-lg">Jaaz</span>
                <Badge className="badge" variant={"secondary"}>
                  beta
                </Badge>
              </div>
            </Link>

            <div className="hidden md:flex gap-4">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} target={item.target}>
                  <button
                    className={`bg-transparent text-sm px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${curPath === item.href ? "bg-accent text-accent-foreground" : ""
                      }`}
                  >
                    {item.name}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <div className="hidden md:flex">
                {/* <Link key={"api_key"} href={"/auth/api_key"}>
                  <button
                    className={`bg-transparent text-sm flex items-center ${
                      curPath === "/auth/api_key" ? "active" : ""
                    }`}
                  >
                    <IconKey size={15} />
                    API Keys
                  </button>
                </Link> */}
              </div>
            )}
            {/* {session && <BalanceButton />} */}
            <LanguageSwitcher />
            <LoginButton />
          </div>
        </div>
      </nav>
    </header>
  );
}
