"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  amount: number;
  primaryColor: string;
  returnUrl: string;
}

function PaymentForm({ onSuccess, onError, amount, primaryColor, returnUrl }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message || "Erreur lors du paiement");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
        }}
      />
      <Button
        type="submit"
        className="w-full"
        size="lg"
        style={{ backgroundColor: primaryColor }}
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? "Traitement en cours..." : `Payer ${amount.toFixed(2)}\u20AC`}
      </Button>
    </form>
  );
}

interface StripePaymentProps {
  clientSecret: string;
  amount: number;
  primaryColor: string;
  returnUrl: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}

export default function StripePayment({
  clientSecret,
  amount,
  primaryColor,
  returnUrl,
  onSuccess,
  onError,
}: StripePaymentProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: primaryColor,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        borderRadius: "8px",
      },
    },
    locale: "fr",
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        onSuccess={onSuccess}
        onError={onError}
        amount={amount}
        primaryColor={primaryColor}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}
