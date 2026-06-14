import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./utils/env.js";
import { logger } from "./utils/logger.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import authRoutes from "./routes/auth.js";
import readerRoutes from "./routes/readers.js";
import readingRoutes from "./routes/readings.js";
import paymentRoutes from "./routes/payments.js";
import forumRoutes from "./routes/forum.js";
import adminRoutes from "./routes/admin.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);

app.get("/api/health", (_req, res) => { res.json({ status: "ok", timestamp: new Date().toISOString() }); });

app.use("/api/auth", authRoutes);
app.use("/api/readers", readerRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/user/balance", async (req, res, next) => {
  const { requireAuth } = await import("./middleware/auth.js");
  requireAuth(req, res, async () => {
    try {
      const { db } = await import("./utils/db.js");
      const { users } = await import("../shared/src/schema.js");
      const { eq } = await import("drizzle-orm");
      const [user] = await db!.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
      if (!user) { res.status(404).json({ success: false, error: { message: "User not found" } }); return; }
      res.json({ success: true, data: { balance: user.accountBalance } });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: "Internal server error" } });
    }
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(err.status || 500).json({
    success: false,
    error: { message: env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message },
  });
});

app.listen(env.PORT, () => {
  logger.info(`SoulSeer server running on port ${env.PORT}`);
});

export default app;
