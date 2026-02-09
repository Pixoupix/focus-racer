import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10" as Stripe.LatestApiVersion,
  typescript: true,
});

export const PLATFORM_FEE_PERCENT = parseInt(
  process.env.PLATFORM_FEE_PERCENT || "10",
  10
);

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
