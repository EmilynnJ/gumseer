import { Router, Request, Response } from "express";
import { db } from "../utils/db.js";
import { users, readings, transactions } from "../../shared/src/schema.js";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { requireAuth, requireRole, requireReadingParticipant } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createReadingSchema, rateReadingSchema, paginationSchema } from "../../shared/src/validators.js";
import { MIN_BALANCE_FOR_READING, READER_SHARE_PERCENT, PLATFORM_FEE_PERCENT } from "../../shared/src/constants.js";
import { generateReadingToken } from "../services/agora.js";
import { calculateSessionCost } from "../services/billing.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.post("/on-demand", requireAuth, requireRole("client"), validate(createReadingSchema), async (req: Request, res: Response) => {
  try {
    const { type, readerId } = req.body;
    const clientId = req.user!.id;

    const [client] = await db.select().from(users).where(eq(users.id, clientId)).limit(1);
    if (!client || client.accountBalance < MIN_BALANCE_FOR_READING) {
      res.status(400).json({ success: false, error: { message: `Minimum $5 balance required. Your balance: $${(client?.accountBalance ?? 0) / 100}` } });
      return;
    }

    const [reader] = await db.select().from(users).where(and(eq(users.id, readerId), eq(users.role, "reader"))).limit(1);
    if (!reader) { res.status(404).json({ success: false, error: { message: "Reader not found" } }); return; }
    if (!reader.isOnline) { res.status(400).json({ success: false, error: { message: "Reader is currently offline" } }); return; }

    let pricePerMinute: number;
    if (type === "chat") pricePerMinute = reader.pricingChat ?? 0;
    else if (type === "voice") pricePerMinute = reader.pricingVoice ?? 0;
    else pricePerMinute = reader.pricingVideo ?? 0;

    if (pricePerMinute === 0 || pricePerMinute == null) {
      res.status(400).json({ success: false, error: { message: "This reader does not offer this reading type" } });
      return;
    }

    if (client.accountBalance < pricePerMinute) {
      res.status(400).json({ success: false, error: { message: "Insufficient balance for even 1 minute" } });
      return;
    }

    const agoraChannel = `reading_${Date.now()}`;
    const [reading] = await db.insert(readings).values({
      readerId, clientId, type, pricePerMinute, status: "pending", agoraChannel, paymentStatus: "pending",
    }).returning();

    logger.info({ readingId: reading?.id, readerId, clientId, type }, "Reading request created");
    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    logger.error({ err }, "POST /api/readings/on-demand error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/:id/accept", requireAuth, requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const readingId = parseInt(req.params.id);
    const [reading] = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
    if (!reading) { res.status(404).json({ success: false, error: { message: "Reading not found" } }); return; }
    if (reading.readerId !== req.user!.id) { res.status(403).json({ success: false, error: { message: "Not your reading" } }); return; }
    if (reading.status !== "pending") { res.status(400).json({ success: false, error: { message: "Reading cannot be accepted" } }); return; }
    const [updated] = await db.update(readings).set({ status: "accepted" }).where(eq(readings.id, readingId)).returning();
    logger.info({ readingId }, "Reading accepted by reader");
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "POST /api/readings/:id/accept error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/:id/agora-token", requireAuth, requireReadingParticipant, async (req: Request, res: Response) => {
  try {
    const reading = (req as any).reading;
    if (reading.status === "completed" || reading.status === "cancelled") {
      res.status(400).json({ success: false, error: { message: "Reading is no longer active" } });
      return;
    }
    const { channelName, token, appId } = generateReadingToken(reading.id, req.user!.id, reading.type);
    res.json({ success: true, data: { channelName, token, appId } });
  } catch (err) {
    logger.error({ err }, "POST /api/readings/:id/agora-token error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/:id/start", requireAuth, requireReadingParticipant, async (req: Request, res: Response) => {
  try {
    const reading = (req as any).reading;
    if (reading.status !== "accepted") {
      res.status(400).json({ success: false, error: { message: "Reading must be accepted first" } });
      return;
    }
    const [updated] = await db.update(readings).set({
      status: "in_progress",
      startedAt: new Date(),
    }).where(eq(readings.id, reading.id)).returning();
    logger.info({ readingId: reading.id }, "Reading session started");
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "POST /api/readings/:id/start error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/:id/end", requireAuth, requireReadingParticipant, async (req: Request, res: Response) => {
  try {
    const reading = (req as any).reading;
    if (reading.status !== "in_progress") {
      res.status(400).json({ success: false, error: { message: "No active session to end" } });
      return;
    }
    if (reading.paymentStatus === "paid") {
      res.status(400).json({ success: false, error: { message: "Already finalized" } });
      return;
    }

    const now = new Date();
    const started = new Date(reading.startedAt);
    const durationMinutes = Math.max(1, Math.ceil((now.getTime() - started.getTime()) / 60000));
    const totalPrice = calculateSessionCost(durationMinutes, reading.pricePerMinute);

    await db.transaction(async (tx) => {
      const [client] = await tx.select().from(users).where(eq(users.id, reading.clientId)).limit(1);
      if (!client) throw new Error("Client not found");

      const finalCost = Math.min(totalPrice, client.accountBalance);
      const readerShare = Math.floor(finalCost * (READER_SHARE_PERCENT / 100));
      const platformShare = finalCost - readerShare;

      await tx.update(users).set({
        accountBalance: sql`${users.accountBalance} - ${finalCost}`,
      }).where(eq(users.id, reading.clientId));

      await tx.update(users).set({
        accountBalance: sql`${users.accountBalance} + ${readerShare}`,
      }).where(eq(users.id, reading.readerId));

      await tx.insert(transactions).values({
        userId: reading.clientId, type: "reading_charge", amount: -finalCost,
        balanceBefore: client.accountBalance, balanceAfter: client.accountBalance - finalCost,
        readingId: reading.id,
      });

      const [reader] = await tx.select().from(users).where(eq(users.id, reading.readerId)).limit(1);
      await tx.insert(transactions).values({
        userId: reading.readerId, type: "reader_credit", amount: readerShare,
        balanceBefore: (reader?.accountBalance ?? 0) - readerShare, balanceAfter: reader?.accountBalance ?? 0,
        readingId: reading.id,
      });

      await tx.update(readings).set({
        status: "completed", completedAt: now, duration: durationMinutes,
        totalPrice: finalCost, paymentStatus: "paid",
      }).where(eq(readings.id, reading.id));
    });

    const [final] = await db.select().from(readings).where(eq(readings.id, reading.id)).limit(1);
    logger.info({ readingId: reading.id, totalPrice }, "Reading session ended and billed");
    res.json({ success: true, data: final });
  } catch (err) {
    logger.error({ err }, "POST /api/readings/:id/end error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/:id/rate", requireAuth, requireReadingParticipant, validate(rateReadingSchema), async (req: Request, res: Response) => {
  try {
    const reading = (req as any).reading;
    if (reading.clientId !== req.user!.id) { res.status(403).json({ success: false, error: { message: "Only the client can rate" } }); return; }
    if (reading.status !== "completed") { res.status(400).json({ success: false, error: { message: "Session not completed" } }); return; }
    if (reading.rating != null) { res.status(400).json({ success: false, error: { message: "Already rated" } }); return; }
    const { rating, review } = req.body;
    const [updated] = await db.update(readings).set({ rating, review: review || null }).where(eq(readings.id, reading.id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "POST /api/readings/:id/rate error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/client", requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "10" } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize as string)));
    const all = await db.select().from(readings).where(eq(readings.clientId, req.user!.id)).orderBy(desc(readings.createdAt));
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/readings/client error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/reader", requireAuth, requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = "10" } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize as string)));
    const all = await db.select().from(readings).where(eq(readings.readerId, req.user!.id)).orderBy(desc(readings.createdAt));
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/readings/reader error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/:id", requireAuth, requireReadingParticipant, async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: (req as any).reading });
  } catch (err) {
    logger.error({ err }, "GET /api/readings/:id error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

export default router;
