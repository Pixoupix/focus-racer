import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-04-10" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop];
  },
});

export const PLATFORM_FEE_PERCENT = 0;

/** 1€ service fee charged to the runner, collected by the platform via application_fee_amount */
export const SERVICE_FEE_CENTS = 100;
export const SERVICE_FEE_EUR = SERVICE_FEE_CENTS / 100; // 1.0
export const SERVICE_FEE_DISPLAY = "1,00\u00a0\u20ac";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
