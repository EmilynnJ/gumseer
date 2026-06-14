import Stripe from "stripe";
import { env } from "../utils/env.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

export async function createPaymentIntent(customerId: string | null, amount: number, userId: number): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    customer: customerId || undefined,
    metadata: { userId: String(userId) },
    automatic_payment_methods: { enabled: true },
  });
  if (!intent.client_secret) throw new Error("No client secret from Stripe");
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

export async function createConnectAccount(email: string): Promise<{ accountId: string; onboardingUrl: string }> {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: { transfers: { requested: true } },
  });
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${env.FRONTEND_URL}/dashboard`,
    return_url: `${env.FRONTEND_URL}/dashboard`,
    type: "account_onboarding",
  });
  return { accountId: account.id, onboardingUrl: link.url };
}

export async function createTransfer(destinationAccount: string, amount: number): Promise<string> {
  const transfer = await stripe.transfers.create({
    amount,
    currency: "usd",
    destination: destinationAccount,
  });
  return transfer.id;
}
