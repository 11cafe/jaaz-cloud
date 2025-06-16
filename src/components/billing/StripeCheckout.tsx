import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

// 在组件渲染外部调用loadStripe，避免每次渲染都重新创建Stripe对象
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface CheckoutFormProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 步骤3-4：结账表单组件（嵌入式支付）
 * 处理支付元素的渲染和支付确认
 * 使用 webhook 处理支付成功后的数据库更新
 */
function CheckoutForm({ amount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 检查URL中是否有支付意图的客户端密钥（用于处理重定向回来的情况）
  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    // 如果URL中有客户端密钥，检索支付意图状态
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage(t('billing:paymentSucceeded'));
          setTimeout(() => onSuccess(), 1000);
          break;
        case 'processing':
          setMessage(t('billing:paymentProcessing'));
          break;
        case 'requires_payment_method':
          setMessage(t('billing:paymentFailed'));
          break;
        default:
          setMessage(t('billing:somethingWentWrong'));
          break;
      }
    });
  }, [stripe, t, onSuccess]);

  /**
   * 步骤3：处理支付表单提交
   * 确认支付，webhook 将自动处理后续的数据库更新
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js尚未加载完成
      return;
    }

    setIsLoading(true);
    setMessage(t('billing:processingPayment'));

    // 步骤3：确认支付
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // 不重定向，在页面内处理
    });

    if (error) {
      // 支付错误处理
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || t('billing:unexpectedError'));
      } else {
        setMessage(t('billing:unexpectedError'));
      }

      toast({
        title: t('billing:paymentFailed2'),
        description: error.message || t('billing:unexpectedError'),
        variant: 'destructive',
      });
      setIsLoading(false);
    } else if (paymentIntent) {
      // 支付成功或处理中
      if (paymentIntent.status === 'succeeded') {
        // 支付成功，webhook 将自动处理余额更新
        setMessage(t('billing:paymentSucceeded'));
        toast({
          title: t('billing:paymentSuccessful'),
          description: t('billing:accountRechargedSuccessfully'),
          variant: 'success',
        });
        setTimeout(() => onSuccess(), 1000);
      } else if (paymentIntent.status === 'processing') {
        // 支付处理中，webhook 将在处理完成后更新数据库
        setMessage(t('billing:paymentProcessing'));
        toast({
          title: t('billing:paymentProcessing'),
          description: t('billing:paymentProcessingDescription'),
          variant: 'default',
        });
        // 支付处理中时也调用 onSuccess，让用户返回主界面
        // webhook 会在后台完成余额更新
        setTimeout(() => onSuccess(), 2000);
      } else {
        setMessage(`${t('billing:paymentFailed2')} ${paymentIntent.status}`);
        setIsLoading(false);
      }
    }
  };

  // 支付元素配置
  const paymentElementOptions = {
    layout: 'tabs' as const,
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {t('billing:rechargeAmount')}${amount}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Stripe支付元素 */}
          <PaymentElement
            id="payment-element"
            options={paymentElementOptions}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {t('billing:cancel')}
            </Button>
            <Button
              disabled={isLoading || !stripe || !elements}
              id="submit"
              type="submit"
              className="flex-1"
              isLoading={isLoading}
            >
              {isLoading ? t('billing:processingPayment') : `${t('billing:pay')} $${amount}`}
            </Button>
          </div>

          {/* 显示错误或成功消息 */}
          {message && (
            <div
              id="payment-message"
              className={`text-sm text-center p-2 rounded ${message.includes(t('billing:paymentSucceeded'))
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}
            >
              {message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

interface StripeCheckoutProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 步骤2：Stripe结账主组件（嵌入式支付模式）
 *
 * 新的嵌入式支付流程（使用 webhook）：
 * 1. 用户选择充值金额并选择嵌入式支付
 * 2. 组件初始化时调用createPaymentIntent API创建支付意图
 * 3. 使用返回的客户端密钥初始化Stripe Elements
 * 4. 用户填写支付信息并提交
 * 5. 确认支付成功后，Stripe webhook 自动处理数据库更新
 * 6. 前端显示成功消息并刷新数据
 */
export default function StripeCheckout({ amount, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  // 步骤2：组件初始化时创建支付意图
  useEffect(() => {

    // 步骤2：调用API创建支付意图
    fetch('/api/billing/createPaymentIntent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          // 设置客户端密钥用于初始化Stripe Elements
          setClientSecret(data.clientSecret);
        } else {
          // 创建支付意图失败
          toast({
            title: t('billing:error'),
            description: data.error || t('billing:failedToInitializePayment'),
            variant: 'destructive',
          });
          onCancel();
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error:', error);
        toast({
          title: t('billing:error'),
          description: t('billing:failedToInitializePayment'),
          variant: 'destructive',
        });
        onCancel();
        setLoading(false);
      });
  }, [amount, onCancel, toast, t]);

  // Stripe Elements外观配置
  const appearance = {
    theme: 'stripe' as const,
  };

  // Stripe Elements选项配置
  const options = {
    clientSecret,
    appearance,
  };

  // 加载状态显示
  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Spinner size="lg" />
          <span className="ml-2">{t('billing:initializingPayment')}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {/* 步骤2-3：使用Stripe Elements包装结账表单 */}
      {clientSecret && stripePromise && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm
            amount={amount}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      )}
    </div>
  );
}
