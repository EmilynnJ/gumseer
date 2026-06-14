import { Router, Request, Response } from "express";
import { db } from "../utils/db.js";
import { users, forumPosts, forumComments, forumFlags, newsletterSubscribers } from "../../shared/src/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createPostSchema, createCommentSchema, flagContentSchema, newsletterSignupSchema, paginationSchema } from "../../shared/src/validators.js";
import { FORUM_POSTS_PER_PAGE } from "../../shared/src/constants.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/posts", async (req: Request, res: Response) => {
  try {
    const { page = "1", pageSize = String(FORUM_POSTS_PER_PAGE), category } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize as string)));

    let query = db.select().from(forumPosts);
    if (category && category !== "all") query = query.where(eq(forumPosts.category, category as any));

    const all = await query.orderBy(desc(forumPosts.createdAt));
    const total = all.length;
    const data = all.slice((p - 1) * ps, p * ps);

    const postsWithComments = await Promise.all(data.map(async (post) => {
      const [counts] = await db.select({ count: sql<number>`count(*)` }).from(forumComments).where(eq(forumComments.postId, post.id));
      return { ...post, commentCount: Number(counts?.count ?? 0) };
    }));

    res.json({ success: true, data: postsWithComments, pagination: { page: p, pageSize: ps, total, totalPages: Math.ceil(total / ps) } });
  } catch (err) {
    logger.error({ err }, "GET /api/forum/posts error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/posts", requireAuth, validate(createPostSchema), async (req: Request, res: Response) => {
  try {
    const { title, content, category } = req.body;
    if (category === "Announcements" && req.user!.role !== "admin") {
      res.status(403).json({ success: false, error: { message: "Only admins can post in Announcements" } });
      return;
    }
    const [post] = await db.insert(forumPosts).values({ userId: req.user!.id, title, content, category }).returning();
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    logger.error({ err }, "POST /api/forum/posts error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.get("/posts/:id", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
    if (!post) { res.status(404).json({ success: false, error: { message: "Post not found" } }); return; }
    const [author] = await db.select({ username: users.username }).from(users).where(eq(users.id, post.userId)).limit(1);
    const comments = await db.select().from(forumComments).where(eq(forumComments.postId, postId)).orderBy(sql`${forumComments.createdAt} ASC`);
    const commentsWithAuthors = await Promise.all(comments.map(async (c) => {
      const [au] = await db.select({ username: users.username }).from(users).where(eq(users.id, c.userId)).limit(1);
      return { ...c, authorName: au?.username ?? "Unknown" };
    }));
    res.json({ success: true, data: { ...post, authorName: author?.username ?? "Unknown", comments: commentsWithAuthors } });
  } catch (err) {
    logger.error({ err }, "GET /api/forum/posts/:id error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/posts/:id/comments", requireAuth, validate(createCommentSchema), async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
    if (!post) { res.status(404).json({ success: false, error: { message: "Post not found" } }); return; }
    const { content } = req.body;
    const [comment] = await db.insert(forumComments).values({ postId, userId: req.user!.id, content }).returning();
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    logger.error({ err }, "POST /api/forum/posts/:id/comments error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/posts/:id/flag", requireAuth, validate(flagContentSchema), async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, postId)).limit(1);
    if (!post) { res.status(404).json({ success: false, error: { message: "Post not found" } }); return; }
    await db.insert(forumFlags).values({ postId, reporterId: req.user!.id, reason: req.body.reason });
    await db.update(forumPosts).set({ flagCount: sql`${forumPosts.flagCount} + 1` }).where(eq(forumPosts.id, postId));
    res.json({ success: true, data: { message: "Post flagged" } });
  } catch (err) {
    logger.error({ err }, "POST /api/forum/posts/:id/flag error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/comments/:id/flag", requireAuth, validate(flagContentSchema), async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const [comment] = await db.select().from(forumComments).where(eq(forumComments.id, commentId)).limit(1);
    if (!comment) { res.status(404).json({ success: false, error: { message: "Comment not found" } }); return; }
    await db.insert(forumFlags).values({ commentId, reporterId: req.user!.id, reason: req.body.reason });
    await db.update(forumComments).set({ flagCount: sql`${forumComments.flagCount} + 1` }).where(eq(forumComments.id, commentId));
    res.json({ success: true, data: { message: "Comment flagged" } });
  } catch (err) {
    logger.error({ err }, "POST /api/forum/comments/:id/flag error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.delete("/posts/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    await db.delete(forumFlags).where(eq(forumFlags.postId, postId));
    await db.delete(forumComments).where(eq(forumComments.postId, postId));
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));
    res.json({ success: true, data: { message: "Post deleted" } });
  } catch (err) {
    logger.error({ err }, "DELETE /api/forum/posts/:id error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.delete("/comments/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    await db.delete(forumFlags).where(eq(forumFlags.commentId, commentId));
    await db.delete(forumComments).where(eq(forumComments.id, commentId));
    res.json({ success: true, data: { message: "Comment deleted" } });
  } catch (err) {
    logger.error({ err }, "DELETE /api/forum/comments/:id error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

router.post("/newsletter", validate(newsletterSignupSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    await db.insert(newsletterSubscribers).values({ email }).onConflictDoNothing();
    res.json({ success: true, data: { message: "Subscribed to newsletter" } });
  } catch (err) {
    logger.error({ err }, "POST /api/newsletter error");
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
});

export default router;
