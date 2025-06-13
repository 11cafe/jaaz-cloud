import { ChangeEvent, useEffect, useState, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import Spinner from "@/components/ui/Spinner";
import Paginator from "@/components/Paginator";
import { Transaction } from "@/server/dbTypes";
import { TransactionType } from "@/schema";
import useIsFirstRender from "@/components/hooks/useIsFirstRender";
import { defaultPageSize } from "@/utils/consts";
import { ERechargePaymentState } from "@/consts/types";
import { handleConsume } from "@/utils/handleConsume";
import { formatToLocalTime } from "@/utils/datatimeUtils";

export default function Billing() {
  const { toast } = useToast();
  const isFirstRender = useIsFirstRender();
  const { mutate } = useSWRConfig();
  const [pageNumber, setPageNumber] = useState(1);
  const [rechargeAmount, setRechargeAmount] = useState<number | string>(10);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const rechargeResultCheckTime = useRef(0);
  const isDev = process.env.NODE_ENV === "development";

  const swrFetcherNeedSignIn = (url: string) =>
    fetch(url).then((res) => {
      if (res.status === 401) {
        signIn();
      }
      return res.json();
    });

  const { data: { balance = "" } = {}, isValidating: isBalanceValidating } =
    useSWR("/api/billing/getBalance", swrFetcherNeedSignIn);

  const {
    data: { data: transactions = [] } = {},
    isValidating: isTransactionValidating,
  } = useSWR(
    `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=${pageNumber}`,
    swrFetcherNeedSignIn,
  );

  const onAmountChange = (val: number) => {
    if (val === 0) {
      setRechargeAmount("");
    } else {
      setRechargeAmount(val);
    }
  };

  const handleRecharge = async () => {
    setRechargeLoading(true);
    const response = await fetch("/api/billing/createCheckoutSession", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: rechargeAmount,
      }),
    }).then((res) => res.json());

    if (response.success && response.url) {
      // Check if it's dev mode (simulated recharge)
      if (response.devMode) {
        // In dev mode, directly refresh balance and show success
        mutate("/api/billing/getBalance");
        mutate(
          `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=1`,
        );
        toast({
          title: "Recharge successful (Dev Mode)",
          description: response.message || "Development mode recharge completed",
          variant: "success",
        });
      } else {
        // Production mode: redirect to Stripe
        window.location.href = response.url;
      }
    } else {
      toast({
        title: "Recharge failure",
        description: response.error,
        variant: "warning",
      });
    }
    setRechargeLoading(false);
  };

  const checkRechargeResult = async (sessionId: string) => {
    const response = await fetch(
      `/api/billing/listTransactions?pageSize=1&pageNumber=1&stripeSessionID=${sessionId}`,
    ).then((res) => res.json());
    if (response.data.length) {
      mutate("/api/billing/getBalance");
      mutate(
        `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=1`,
      );
      toast({
        title: "Recharge successful",
        variant: "success",
      });
    } else if (rechargeResultCheckTime.current < 5) {
      // Sometimes when recharge is successful, the deposit is slow, resulting in failure to effectively update the balance.
      setTimeout(() => {
        checkRechargeResult(sessionId);
      }, 1000);
      rechargeResultCheckTime.current = rechargeResultCheckTime.current + 1;
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentState = urlParams.get("paymentState");
    const sessionId = urlParams.get("sessionId");

    if (paymentState) {
      switch (paymentState) {
        case ERechargePaymentState.SUCCESS:
          sessionId && checkRechargeResult(sessionId);
          break;
        case ERechargePaymentState.CANCEL:
          toast({
            title: "Recharge canceled",
            variant: "info",
          });
          break;
      }

      setTimeout(() => {
        window.history.replaceState(null, "", window.location.pathname);
      }, 1000);
    }
  }, []);

  const inputError = typeof rechargeAmount === "number" && rechargeAmount < 1;

  // to avoid react-hydration-error and make this page client render component
  if (isFirstRender) {
    return null;
  }

  return (
    <div className="p-8 w-full">
      <div className="flex flex-col gap-8">
        {/* Balance and Add Funds Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">
                Balance: ${balance}
              </CardTitle>
              {isBalanceValidating && <Spinner size="sm" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Add Funds</h3>
                {isDev && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Dev Mode
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-start gap-4 mb-4">
                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((val) => (
                    <Button
                      key={val}
                      variant={rechargeAmount === val ? "default" : "outline"}
                      size="lg"
                      onClick={() => setRechargeAmount(val)}
                    >
                      ${val}
                    </Button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="flex flex-col">
                  <Input
                    type="number"
                    step={1}
                    value={rechargeAmount}
                    min={5}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAmountChange(Number(e.target.value))
                    }
                    className="w-56"
                    placeholder="Enter amount ($)"
                  />
                  {inputError && (
                    <span className="text-sm text-red-500 mt-1">
                      Minimum top-up: $5
                    </span>
                  )}
                </div>
              </div>

              <Button
                disabled={!rechargeAmount || inputError || rechargeLoading}
                size="lg"
                onClick={handleRecharge}
                isLoading={rechargeLoading}
              >
                {rechargeLoading ? "Processing..." : "Confirm Top-up"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              {isTransactionValidating && <Spinner size="sm" />}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((item: Transaction) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatToLocalTime(item.created_at)}</TableCell>
                      <TableCell>{item.transaction_type}</TableCell>
                      <TableCell>{item.amount}</TableCell>
                      <TableCell>{item.description ?? "--"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      {isTransactionValidating
                        ? "Loading"
                        : "No transactions found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="mt-4">
              <Paginator
                onPageChange={setPageNumber}
                pageNumber={pageNumber}
                loading={isTransactionValidating}
                noMoreData={transactions.length === 0}
              />
            </div>

            {/* Mock consume button - commented out */}
            {/* <Button
              disabled={!rechargeAmount || inputError}
              size="lg"
              onClick={() => {
                handleConsume(20, TransactionType.CONSUME, "consume-20");
              }}
            >
              mock consume
            </Button> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
