import { Router, Request, Response } from "express";
import { db } from "../utils/db.js";
import { users, transactions } from "../../shared/src/schema.js";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { topUpSchema, paginationSchema } from "../../shared/src/validators.js";
import { createPaymentIntent, verifyWebhookSignature } from "../services/stripe.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.post("/create-intent", requireAuth, validate(topUpSchema), async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ success: false, error: { message: "User not found" } }); return; }
    const { clientSecret, paymentIntentId } = await createPaymentIntent(user.stripeCustomerId, amount, user.id);
    res.json({ success: true, data: { clientSecret, amount, paymentIntentId } });
  } catch (err) {
    logger.error({ err }, "POST /api/payments/create-intent error");
    res.status(500).json({ success: false, error: { message: "Payment intent creation failed" } });
  }
});

router.post("/webhooks/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) { res.status(400).json({ success: false, error: { message: "Missing signature" } }); return; }

  let event;
  try {
    event = verifyWebhookSignature(JSON.stringify(req.body), sig);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature verification failed");
    res.status(400).json({ success: false, error: { message: "Invalid signature" } });
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as any;
    const userId = parseInt(pi.metadata?.userId);
    const amount = pi.amount;

    if (!isNaN(userId) && amount > 0) {
      try {
        await db.transaction(async (tx) => {
          const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
          if (!user) throw new Error(`User ${userId} not found`);

          const newBalance = user.accountBalance + amount;
          await tx.update(users).set({ accountBalance: newBalance, stripeCustomerId: pi.customer || user.stripeCustomerId }).where(eq(users.id, userId));
          await tx.insert(transactions).values({
            userId, type: "top_up", amount, balanceBefore: user.accountBalance, balanceAfter: newBalance,
            stripeId: pi.id,
          });
        });
        logger.info({ userId, amount }, "Stripe top-up processed");
      } catch (err) {
        logger.error({ err, userId, amount }, "Stripe webhook processing error");
      }
    }

    res.json({ received: true });
    return;
  }

  res.json({ received: true });
});

router.get("/transactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize as string)));
    const userId = req.user!.id;
    const all = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(sql`${transactions.createdAt} DESC`);
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/transactions error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

export default router;
