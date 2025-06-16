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
import StripeCheckout from "@/components/billing/StripeCheckout";
import { RECHARGE_LIMITS } from "@/utils/billingUtil";
import { useTranslation } from 'react-i18next';

/**
 * 计费页面组件 - Stripe支付流程的主入口
 *
 * 支付流程概述：
 * 1. 用户选择充值金额
 * 2. 选择支付方式（嵌入式支付 或 重定向到Stripe）
 * 3. 创建支付意图或结账会话
 * 4. 处理支付确认
 * 5. Webhook 自动更新用户余额和交易记录
 */
export default function Billing() {
  const { t } = useTranslation(['billing', 'common']);
  const { toast } = useToast();
  const isFirstRender = useIsFirstRender();
  const { mutate } = useSWRConfig();

  // 分页状态
  const [pageNumber, setPageNumber] = useState(1);
  // 充值金额
  const [rechargeAmount, setRechargeAmount] = useState<number | string>(10);
  // 充值加载状态
  const [rechargeLoading, setRechargeLoading] = useState(false);
  // 是否显示嵌入式结账组件
  const [showEmbeddedCheckout, setShowEmbeddedCheckout] = useState(false);

  // 支付方式配置：embedded（嵌入式）或 redirect（重定向）
  // 开发者可以手动修改此变量来选择支付方式：
  // - 'embedded': 嵌入式支付，用户在当前页面完成支付
  // - 'redirect': 重定向支付，跳转到Stripe托管页面完成支付
  const paymentMethod: 'redirect' | 'embedded' = 'redirect';

  // 充值结果检查次数计数器
  const rechargeResultCheckTime = useRef(0);
  const isDev = process.env.NODE_ENV === "development";

  // SWR数据获取器，处理401未授权状态
  const swrFetcherNeedSignIn = (url: string) =>
    fetch(url).then((res) => {
      if (res.status === 401) {
        signIn(); // 未授权时触发登录
      }
      return res.json();
    });

  // 获取用户余额数据
  const { data: { balance = "" } = {}, isValidating: isBalanceValidating } =
    useSWR("/api/billing/getBalance", swrFetcherNeedSignIn);

  // 获取交易记录数据
  const {
    data: { data: transactions = [] } = {},
    isValidating: isTransactionValidating,
  } = useSWR(
    `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=${pageNumber}`,
    swrFetcherNeedSignIn,
  );

  // 处理充值金额变化
  const onAmountChange = (val: number) => {
    if (val === 0) {
      setRechargeAmount("");
    } else {
      setRechargeAmount(val);
    }
  };

  /**
   * 步骤1：处理充值请求
   * 根据选择的支付方式执行不同的流程
   */
  const handleRecharge = async () => {
    // 嵌入式支付流程
    // if (paymentMethod === 'embedded') {
    //   // 显示嵌入式结账组件，支付成功后 webhook 自动处理数据库更新
    //   setShowEmbeddedCheckout(true);
    //   return;
    // }

    // 重定向支付流程
    setRechargeLoading(true);

    // 步骤1a：创建Stripe结账会话（重定向模式）
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
      // 步骤1b：重定向到Stripe托管的结账页面
      window.location.href = response.url;
    } else {
      toast({
        title: t('billing:rechargeFailure'),
        description: response.error,
        variant: "warning",
      });
    }
    setRechargeLoading(false);
  };

  /**
   * 步骤5：处理支付成功回调（嵌入式支付）
   * 当StripeCheckout组件确认支付成功后调用
   * 使用延迟刷新以确保 webhook 有时间处理数据库更新
   */
  const handlePaymentSuccess = () => {
    setShowEmbeddedCheckout(false);

    // 立即显示成功消息
    toast({
      title: t('billing:paymentSuccessful'),
      description: t('billing:accountRechargedSuccessfully'),
      variant: "success",
    });

    // 延迟刷新数据，给 webhook 时间处理
    setTimeout(() => {
      mutate("/api/billing/getBalance");
      mutate(
        `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=1`,
      );
    }, 2000); // 2秒延迟
  };

  /**
   * 处理支付取消
   */
  const handlePaymentCancel = () => {
    setShowEmbeddedCheckout(false);
  };

  /**
   * 步骤5：检查充值结果（重定向支付）
   * 用于重定向支付模式下验证支付是否成功处理
   * @param sessionId Stripe会话ID
   */
  const checkRechargeResult = async (sessionId: string) => {
    const response = await fetch(
      `/api/billing/listTransactions?pageSize=1&pageNumber=1&stripeSessionID=${sessionId}`,
    ).then((res) => res.json());

    if (response.data.length) {
      // 找到对应的交易记录，说明支付已处理
      mutate("/api/billing/getBalance");
      mutate(
        `/api/billing/listTransactions?pageSize=${defaultPageSize}&pageNumber=1`,
      );
      toast({
        title: t('billing:rechargeSuccessful'),
        variant: "success",
      });
    } else if (rechargeResultCheckTime.current < 5) {
      // 有时充值成功后，入账较慢，导致无法有效更新余额
      // 最多重试5次，每次间隔1秒
      setTimeout(() => {
        checkRechargeResult(sessionId);
      }, 1000);
      rechargeResultCheckTime.current = rechargeResultCheckTime.current + 1;
    }
  };

  /**
   * 处理URL参数中的支付状态（重定向支付返回）
   * 当用户从Stripe重定向回来时，URL会包含支付状态参数
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentState = urlParams.get("paymentState");
    const sessionId = urlParams.get("sessionId");

    if (paymentState) {
      switch (paymentState) {
        case ERechargePaymentState.SUCCESS:
          // 支付成功，检查充值结果
          sessionId && checkRechargeResult(sessionId);
          break;
        case ERechargePaymentState.CANCEL:
          // 支付取消
          toast({
            title: t('billing:rechargeCanceled'),
            variant: "info",
          });
          break;
      }

      // 清理URL参数
      setTimeout(() => {
        window.history.replaceState(null, "", window.location.pathname);
      }, 1000);
    }
  }, [toast]);

  // 金额验证逻辑
  const validateAmount = (amount: number | string): { valid: boolean; error?: string } => {
    const numAmount = Number(amount);

    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return { valid: false, error: t('billing:invalidAmount') };
    }

    if (numAmount < RECHARGE_LIMITS.MIN_AMOUNT) {
      return { valid: false, error: t('billing:minimumAmount') };
    }

    if (numAmount > RECHARGE_LIMITS.MAX_AMOUNT) {
      return { valid: false, error: t('billing:maximumAmount') };
    }

    return { valid: true };
  };

  const amountValidation = validateAmount(rechargeAmount);
  const inputError = !amountValidation.valid;

  // 避免React水合错误，使此页面成为客户端渲染组件
  if (isFirstRender) {
    return null;
  }

  return (
    <div className="p-8 w-full">
      <div className="flex flex-col gap-8">
        {/* 余额和充值卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">
                {t('billing:balance')}: ${balance}
              </CardTitle>
              {isBalanceValidating && <Spinner size="sm" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">{t('billing:addFunds')}</h3>
              </div>

              {!showEmbeddedCheckout ? (
                <>
                  <div className="flex flex-wrap items-start gap-4 mb-4">
                    {/* 快速金额按钮 */}
                    <div className="flex gap-2">
                      {[5, 10, 20, 50].map((val) => (
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

                    {/* 自定义金额输入 */}
                    <div className="flex flex-col">
                      <Input
                        type="number"
                        step={1}
                        value={rechargeAmount}
                        min={RECHARGE_LIMITS.MIN_AMOUNT}
                        max={RECHARGE_LIMITS.MAX_AMOUNT}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onAmountChange(Number(e.target.value))
                        }
                        className="w-56"
                        placeholder={t('billing:enterAmount')}
                      />
                      {inputError && (
                        <span className="text-sm text-red-500 mt-1">
                          {amountValidation.error}
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
                    {rechargeLoading ? t('billing:processing') : t('billing:confirmTopUp')}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  {/* 步骤2-4：嵌入式Stripe结账组件 */}
                  <StripeCheckout
                    amount={Number(rechargeAmount)}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 交易记录卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{t('billing:recentTransactions')}</CardTitle>
              {isTransactionValidating && <Spinner size="sm" />}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('billing:time')}</TableHead>
                  <TableHead>{t('billing:type')}</TableHead>
                  <TableHead>{t('billing:amount')}</TableHead>
                  <TableHead>{t('billing:description')}</TableHead>
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
                        ? t('common:loading')
                        : t('billing:noTransactionsFound')}
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

            {/* 模拟消费按钮 - 仅开发环境 */}
            {isDev && (
              <Button
                disabled={!rechargeAmount || inputError}
                size="lg"
                onClick={() => {
                  handleConsume(1, TransactionType.CONSUME_TEXT, "consume-1");
                }}
              >
                {t('billing:mockConsume')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
