import { Router, Request, Response } from "express";
import { db } from "../utils/db.js";
import { users } from "../../shared/src/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ success: false, error: { message: "User not found" } }); return; }
    res.json({ success: true, data: user });
  } catch (err) {
    logger.error({ err }, "GET /api/auth/me error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/sync", requireAuth, async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(users).where(eq(users.auth0Id, req.user!.auth0Id)).limit(1);
    if (existing) {
      res.json({ success: true, data: existing });
      return;
    }
    const [newUser] = await db.insert(users).values({
      auth0Id: req.user!.auth0Id,
      email: req.user!.email,
      username: req.user!.email.split("@")[0] || "user",
      fullName: req.user!.email.split("@")[0] || "User",
      role: "client",
      accountBalance: 0,
    }).returning();
    logger.info({ userId: newUser?.id }, "New user synced from Auth0");
    res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    logger.error({ err }, "POST /api/auth/sync error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

export default router;
