import {
  Box,
  Button,
  ButtonGroup,
  Heading,
  HStack,
  Flex,
  Input,
  VStack,
  Spinner,
  InputGroup,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/toast";
import {
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/table";
import {
  FormControl,
  FormErrorMessage,
} from "@chakra-ui/form-control";
import { Divider } from "@chakra-ui/layout";
import { ChangeEvent, useEffect, useState, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import Paginator from "@/components/Paginator";
import { Transaction } from "@/server/dbTypes";
import { TransactionType } from "@/schema";
import useIsFirstRender from "@/components/hooks/useIsFirstRender";
import { defaultPageSize } from "@/utils/consts";
import { ERechargePaymentState } from "@/consts/types";
import { handleConsume } from "@/utils/handleConsume";
import { signIn } from "next-auth/react";

export default function Billing() {
  const toast = useToast();
  const isFirstRender = useIsFirstRender();
  const { mutate } = useSWRConfig();
  const [pageNumber, setPageNumber] = useState(1);
  const [rechargeAmount, setRechargeAmount] = useState<number | string>(10);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const rechargeResultCheckTime = useRef(0);
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
      window.location.href = response.url;
    } else {
      toast({
        title: "Recharge failure",
        description: response.error,
        status: "warning",
        duration: 10000,
        isClosable: true,
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
        status: "success",
        duration: 3000,
        isClosable: true,
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
            status: "info",
            duration: 3000,
            isClosable: true,
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
    <Box p={8} w="100%">
      <VStack gap={8}>
        <Box w="100%" p={8} borderWidth={1} borderRadius="lg" boxShadow="md">
          <Flex alignItems="center" mb={4}>
            <Heading size="lg" mb={0}>
              Balance: ${balance}
            </Heading>
            {isBalanceValidating && <Spinner ml={2} size={"xs"} color="gray" />}
          </Flex>
          <Divider mb={4} />
          <Heading size="md" mb={4}>
            Add Funds
          </Heading>
          <HStack gap={4} mb={4}>
            <ButtonGroup size="lg" variant="outline">
              {[5, 10, 15, 20].map((val) => (
                <Button
                  key={val}
                  onClick={() => setRechargeAmount(val)}
                  colorScheme={rechargeAmount === val ? "purple" : "gray"}
                >
                  ${val}
                </Button>
              ))}
            </ButtonGroup>
            <FormControl isInvalid={inputError}>
              <InputGroup>
                <Input
                  type="number"
                  step={1}
                  value={rechargeAmount}
                  min={5}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onAmountChange(Number(e.target.value))
                  }
                  maxW="220px"
                  placeholder="Enter amount ($)"
                  size="lg"
                />
              </InputGroup>
              {inputError && (
                <FormErrorMessage position="absolute">
                  Minimum top-up: $5
                </FormErrorMessage>
              )}
            </FormControl>
          </HStack>
          <Button
            disabled={!rechargeAmount || inputError || rechargeLoading}
            colorScheme="purple"
            size="lg"
            onClick={handleRecharge}
          >
            {rechargeLoading ? "Processing..." : "Confirm Top-up"}
          </Button>
        </Box>
        <Box w="100%" p={8} borderWidth={1} borderRadius="lg" boxShadow="md">
          <Heading size="md" mb={4}>
            Recent Transactions
            {isTransactionValidating && (
              <Spinner ml={2} size={"xs"} color="gray" />
            )}
          </Heading>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Type</Th>
                <Th>Amount</Th>
                <Th>Description</Th>
              </Tr>
            </Thead>
            <Tbody>
              {transactions.length > 0 ? (
                transactions.map((item: Transaction) => (
                  <Tr key={item.id}>
                    <Td>{item.created_at}</Td>
                    <Td>{item.transaction_type}</Td>
                    <Td>{item.amount}</Td>
                    <Td>{item.description ?? "--"}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={5} textAlign="center">
                    {isTransactionValidating
                      ? "Loading"
                      : "No transactions found"}
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          <Paginator
            onPageChange={setPageNumber}
            pageNumber={pageNumber}
            loading={isTransactionValidating}
            noMoreData={transactions.length === 0}
          />
          {/* <Button
            isDisabled={!rechargeAmount || inputError}
            colorScheme="purple"
            size="lg"
            onClick={() => {
              handleConsume(20, TransactionType.CONSUME, "consume-20");
            }}
          >
            mock consume
          </Button> */}
        </Box>
      </VStack>
    </Box>
  );
}
