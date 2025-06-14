import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import useSWR, { useSWRConfig } from "swr";
import { swrFetcher } from "@/utils/swrFetcher";
import { UPDATE_BALANCE_CUSTOM_EVENT } from "@/utils/consts";

const getBalanceUrl = "/api/billing/getBalance";

export default function BalanceButton() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: session, update } = useSession();

  const { data: { balance = "0.00" } = {} } = useSWR(
    session?.user?.id ? getBalanceUrl : null,
    swrFetcher,
  );

  const refreshBalance = () => {
    mutate(getBalanceUrl);
  };

  useEffect(() => {
    update({
      balance,
    });
  }, [balance]);

  useEffect(() => {
    window.addEventListener(UPDATE_BALANCE_CUSTOM_EVENT, refreshBalance);
    return () => {
      window.removeEventListener(UPDATE_BALANCE_CUSTOM_EVENT, refreshBalance);
    };
  }, []);

  return session?.user.id ? (
    <Link key="billing" href="/billing">
      <Button
        variant={"ghost"}
        size={"sm"}
        // isActive={router.pathname === "/billing"}
      >
        ${balance}
      </Button>
    </Link>
  ) : null;
}
