import { Router, Request, Response } from "express";
import { db } from "../utils/db.js";
import { users, readings } from "../../shared/src/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updatePricingSchema, updateProfileSchema, paginationSchema } from "../../shared/src/validators.js";
import { READERS_PER_PAGE } from "../../shared/src/constants.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = String(READERS_PER_PAGE), specialty, online, type } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize as string)));
    let query = db.select().from(users).where(eq(users.role, "reader"));
    if (online === "true") query = query.where(eq(users.isOnline, true));
    const allReaders = await query.orderBy(
      sql`CASE WHEN ${users.isOnline} = true THEN 0 ELSE 1 END`,
      desc(users.createdAt)
    );
    let filtered = allReaders;
    if (specialty) {
      const s = (specialty as string).toLowerCase();
      filtered = filtered.filter(r => r.specialties?.some(sp => sp.toLowerCase().includes(s)));
    }
    if (type === "chat") filtered = filtered.filter(r => r.pricingChat != null);
    if (type === "voice") filtered = filtered.filter(r => r.pricingVoice != null);
    if (type === "video") filtered = filtered.filter(r => r.pricingVideo != null);
    const total = filtered.length;
    const totalPages = Math.ceil(total / ps);
    const data = filtered.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data, pagination: { page: p, pageSize: ps, total, totalPages } });
  } catch (err) {
    logger.error({ err }, "GET /api/readers error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/online", async (_req: Request, res: Response) => {
  try {
    const onlineReaders = await db.select().from(users).where(and(eq(users.role, "reader"), eq(users.isOnline, true))).orderBy(desc(users.createdAt));
    res.json({ success: true, data: onlineReaders });
  } catch (err) {
    logger.error({ err }, "GET /api/readers/online error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ success: false, error: { message: "Invalid ID" } }); return; }
    const [reader] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "reader"))).limit(1);
    if (!reader) { res.status(404).json({ success: false, error: { message: "Reader not found" } }); return; }
    const ratingStats = await db.select({
      avgRating: sql<number>`COALESCE(AVG(${readings.rating}), 0)`.as("avgRating"),
      count: sql<number>`COUNT(${readings.id})`.as("count"),
    }).from(readings).where(and(eq(readings.readerId, id), eq(readings.status, "completed")));
    const recentReviews = await db.select({
      id: readings.id, rating: readings.rating, review: readings.review, createdAt: readings.createdAt,
    }).from(readings).where(and(eq(readings.readerId, id), eq(readings.status, "completed"))).orderBy(desc(readings.createdAt)).limit(5);
    res.json({
      success: true,
      data: {
        ...reader,
        avgRating: Number(ratingStats[0]?.avgRating ?? 0),
        reviewCount: Number(ratingStats[0]?.count ?? 0),
        recentReviews: recentReviews.filter(r => r.review != null),
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /api/readers/:id error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.patch("/status", requireAuth, requireRole("reader"), async (req: Request, res: Response) => {
  try {
    const [updated] = await db.update(users).set({ isOnline: sql`NOT ${users.isOnline}` }).where(eq(users.id, req.user!.id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "PATCH /api/readers/status error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.patch("/pricing", requireAuth, requireRole("reader"), validate(updatePricingSchema), async (req: Request, res: Response) => {
  try {
    const { pricingChat, pricingVoice, pricingVideo } = req.body;
    const [updated] = await db.update(users).set({ pricingChat, pricingVoice, pricingVideo }).where(eq(users.id, req.user!.id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "PATCH /api/readers/pricing error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.patch("/profile", requireAuth, requireRole("reader"), validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const { bio, specialties } = req.body;
    const updateData: any = {};
    if (bio !== undefined) updateData.bio = bio;
    if (specialties !== undefined) updateData.specialties = specialties;
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, req.user!.id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error({ err }, "PATCH /api/readers/profile error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

export default router;
