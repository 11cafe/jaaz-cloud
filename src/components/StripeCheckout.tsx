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
 */
function CheckoutForm({ amount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

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
          setMessage('Payment succeeded!');
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe]);

  /**
   * 步骤4：轮询检查支付状态
   * 由于支付处理可能需要时间，需要定期检查支付状态
   * @param intentId 支付意图ID
   */
  const checkPaymentStatus = async (intentId: string) => {
    try {
      // 调用后端API检查支付状态
      const response = await fetch('/api/billing/checkPaymentStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: intentId }),
      });

      const data = await response.json();

      if (data.status === 'succeeded' || data.status === 'already_processed') {
        // 支付成功或已处理
        setMessage('Payment successful!');
        toast({
          title: 'Payment successful',
          description: 'Your account has been recharged successfully!',
          variant: 'success',
        });
        setTimeout(() => onSuccess(), 1000);
      } else if (data.status === 'processing') {
        // 支付处理中，继续轮询
        setTimeout(() => checkPaymentStatus(intentId), 2000);
      } else {
        // 支付失败或其他状态
        setMessage(`Payment ${data.status}. Please try again.`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setMessage('Error checking payment status');
      setIsLoading(false);
    }
  };

  /**
   * 步骤3：处理支付表单提交
   * 确认支付并开始状态检查流程
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js尚未加载完成
      return;
    }

    setIsLoading(true);
    setMessage('Processing payment...');

    // 步骤3：确认支付
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // 不重定向，在页面内处理
    });

    if (error) {
      // 支付错误处理
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'An unexpected error occurred.');
      } else {
        setMessage('An unexpected error occurred.');
      }

      toast({
        title: 'Payment failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setIsLoading(false);
    } else if (paymentIntent) {
      // 支付成功或处理中
      if (paymentIntent.status === 'succeeded') {
        // 支付成功，检查后端处理状态
        checkPaymentStatus(paymentIntent.id);
      } else if (paymentIntent.status === 'processing') {
        // 支付处理中，开始轮询状态
        setMessage('Payment is processing...');
        checkPaymentStatus(paymentIntent.id);
      } else {
        setMessage(`Payment ${paymentIntent.status}`);
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
          Complete Payment - ${amount}
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
              Cancel
            </Button>
            <Button
              disabled={isLoading || !stripe || !elements}
              id="submit"
              type="submit"
              className="flex-1"
              isLoading={isLoading}
            >
              {isLoading ? 'Processing...' : `Pay $${amount}`}
            </Button>
          </div>

          {/* 显示错误或成功消息 */}
          {message && (
            <div
              id="payment-message"
              className={`text-sm text-center p-2 rounded ${message.includes('succeeded')
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
 * 嵌入式支付流程：
 * 1. 用户选择充值金额并选择嵌入式支付
 * 2. 组件初始化时调用createPaymentIntent API创建支付意图
 * 3. 使用返回的客户端密钥初始化Stripe Elements
 * 4. 用户填写支付信息并提交
 * 5. 确认支付并轮询检查支付状态
 * 6. 支付成功后更新用户余额和交易记录
 */
export default function StripeCheckout({ amount, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
          // 从客户端密钥中提取支付意图ID
          const intentId = data.clientSecret.split('_secret_')[0];
          setPaymentIntentId(intentId);
        } else {
          // 创建支付意图失败
          toast({
            title: 'Error',
            description: data.error || 'Failed to initialize payment',
            variant: 'destructive',
          });
          onCancel();
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize payment',
          variant: 'destructive',
        });
        onCancel();
        setLoading(false);
      });
  }, [amount, onCancel, toast, onSuccess]);

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
          <span className="ml-2">Initializing payment...</span>
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
