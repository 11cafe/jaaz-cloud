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

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface CheckoutFormProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ amount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

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

  // Function to check payment status
  const checkPaymentStatus = async (intentId: string) => {
    try {
      const response = await fetch('/api/billing/checkPaymentStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: intentId }),
      });

      const data = await response.json();

      if (data.status === 'succeeded' || data.status === 'already_processed') {
        setMessage('Payment successful!');
        toast({
          title: 'Payment successful',
          description: 'Your account has been recharged successfully!',
          variant: 'success',
        });
        setTimeout(() => onSuccess(), 1000);
      } else if (data.status === 'processing') {
        // Continue polling
        setTimeout(() => checkPaymentStatus(intentId), 2000);
      } else {
        setMessage(`Payment ${data.status}. Please try again.`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setMessage('Error checking payment status');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsLoading(true);
    setMessage('Processing payment...');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Don't redirect, handle in-page
    });

    if (error) {
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
      // Payment succeeded or is processing
      if (paymentIntent.status === 'succeeded') {
        // Check payment status on our server
        checkPaymentStatus(paymentIntent.id);
      } else if (paymentIntent.status === 'processing') {
        setMessage('Payment is processing...');
        // Start polling for payment status
        checkPaymentStatus(paymentIntent.id);
      } else {
        setMessage(`Payment ${paymentIntent.status}`);
        setIsLoading(false);
      }
    }
  };

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

          {/* Show any error or success messages */}
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

export default function StripeCheckout({ amount, onSuccess, onCancel }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {

    // Create PaymentIntent as soon as the page loads
    fetch('/api/billing/createPaymentIntent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          // Extract payment intent ID from client secret
          const intentId = data.clientSecret.split('_secret_')[0];
          setPaymentIntentId(intentId);
        } else {
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

  const appearance = {
    theme: 'stripe' as const,
  };

  const options = {
    clientSecret,
    appearance,
  };

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
