import { Router, Request, Response } from "express";
import { db } from "../utils/db.js";
import { users, readings, transactions, forumFlags } from "../../shared/src/schema.js";
import * as schema from "../../shared/src/schema.js";
import { eq, desc, sql, and, or, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createReaderSchema, balanceAdjustSchema, paginationSchema } from "../../shared/src/validators.js";
import { PAYOUT_THRESHOLD } from "../../shared/src/constants.js";
import { createConnectAccount, createTransfer } from "../services/stripe.js";
import { logger } from "../utils/logger.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/users", async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "50", role, search } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize as string)));
    let query = db.select().from(users);
    if (role) query = query.where(eq(users.role, role as any));
    const all = await query.orderBy(desc(users.createdAt));
    let filtered = all;
    if (search) {
      const s = (search as string).toLowerCase();
      filtered = filtered.filter(u => u.email.toLowerCase().includes(s) || u.username.toLowerCase().includes(s) || u.fullName.toLowerCase().includes(s));
    }
    const total = filtered.length;
    const data = filtered.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/users error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/readers", validate(createReaderSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { accountId, onboardingUrl } = await createConnectAccount(body.email);
    const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

    const [reader] = await db.insert(users).values({
      email: body.email,
      username: body.username,
      fullName: body.fullName,
      role: "reader",
      bio: body.bio,
      specialties: body.specialties,
      pricingChat: body.pricingChat,
      pricingVoice: body.pricingVoice,
      pricingVideo: body.pricingVideo,
      stripeAccountId: accountId,
      auth0Id: `pending_${Date.now()}`,
      accountBalance: 0,
      isOnline: false,
    }).returning();

    logger.info({ readerId: reader?.id, email: body.email }, "Reader created by admin");
    res.status(201).json({
      success: true,
      data: {
        ...reader,
        initialPassword: tempPassword,
        stripeOnboardingUrl: onboardingUrl,
      },
    });
  } catch (err) {
    logger.error({ err }, "POST /api/admin/readers error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.patch("/readers/:id", async (req: Request, res: Response) => {
  try {
    const readerId = parseInt(req.params.id);
    const [reader] = await db.select().from(users).where(and(eq(users.id, readerId), eq(users.role, "reader"))).limit(1);
    if (!reader) { res.status(404).json({ success: false, error: { message: "Reader not found" } }); return; }
    const allowed = ["bio", "specialties", "profileImage", "pricingChat", "pricingVoice", "pricingVideo", "fullName", "email", "username"];
    const updateData: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, readerId)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "PATCH /api/admin/readers/:id error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/readings", async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "50", status, readerId, clientId } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize as string)));
    let query = db.select().from(readings);
    if (status) query = query.where(eq(readings.status, status as any));
    if (readerId) query = query.where(eq(readings.readerId, parseInt(readerId as string)));
    if (clientId) query = query.where(eq(readings.clientId, parseInt(clientId as string)));
    const all = await query.orderBy(desc(readings.createdAt));
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/readings error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "50", type, userId } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize as string)));
    let query = db.select().from(transactions);
    if (type) query = query.where(eq(transactions.type, type as any));
    if (userId) query = query.where(eq(transactions.userId, parseInt(userId as string)));
    const all = await query.orderBy(desc(transactions.createdAt));
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/transactions error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/balance-adjust", validate(balanceAdjustSchema), async (req: Request, res: Response) => {
  try {
    const { userId, amount, note } = req.body;
    await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("User not found");
      const newBalance = user.accountBalance + amount;
      if (newBalance < 0) throw new Error("Balance cannot go negative");
      await tx.update(users).set({ accountBalance: newBalance }).where(eq(users.id, userId));
      await tx.insert(transactions).values({
        userId, type: "adjustment", amount,
        balanceBefore: user.accountBalance, balanceAfter: newBalance,
        note,
      });
    });
    logger.info({ userId, amount, note }, "Balance adjusted by admin");
    res.json({ success: true, data: { message: "Balance adjusted" } });
  } catch (err: any) {
    logger.error({ err }, "POST /api/admin/balance-adjust error");
    res.status(400).json({ success: false, error: { message: err.message || "Internal server error" } });
  }
});

router.post("/payouts/:readerId", async (req: Request, res: Response) => {
  try {
    const readerId = parseInt(req.params.readerId);
    const [reader] = await db.select().from(users).where(and(eq(users.id, readerId), eq(users.role, "reader"))).limit(1);
    if (!reader) { res.status(404).json({ success: false, error: { message: "Reader not found" } }); return; }
    if (reader.accountBalance < PAYOUT_THRESHOLD) {
      res.status(400).json({ success: false, error: { message: `Minimum $${PAYOUT_THRESHOLD / 100} balance required for payout` } });
      return;
    }
    if (!reader.stripeAccountId) {
      res.status(400).json({ success: false, error: { message: "Reader has no Stripe Connect account" } });
      return;
    }
    const payoutAmount = reader.accountBalance;
    const transferId = await createTransfer(reader.stripeAccountId, payoutAmount);

    await db.transaction(async (tx) => {
      await tx.update(users).set({ accountBalance: 0 }).where(eq(users.id, readerId));
      await tx.insert(transactions).values({
        userId: readerId, type: "payout", amount: -payoutAmount,
        balanceBefore: reader.accountBalance, balanceAfter: 0,
        stripeId: transferId,
        note: "Manual payout triggered by admin",
      });
    });

    logger.info({ readerId, payoutAmount, transferId }, "Reader payout processed");
    res.json({ success: true, data: { message: "Payout processed", amount: payoutAmount, transferId } });
  } catch (err) {
    logger.error({ err }, "POST /api/admin/payouts/:readerId error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/forum/flagged", async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "20" } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize as string)));
    const all = await db.select().from(forumFlags).where(isNull(forumFlags.reviewedAt)).orderBy(desc(sql`${forumFlags.id}`));
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/forum/flagged error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

export default router;
