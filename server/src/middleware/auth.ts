import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { db } from "../utils/db.js";
import { users } from "../../shared/src/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; auth0Id: string; role: string; email: string; username: string };
    }
  }
}

const jwks = jwksClient({ jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json` });

function getKey(header: jwt.JwtHeader, cb: jwt.SigningKeyCallback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) cb(err);
    else cb(null, key?.getPublicKey());
  });
}

function verifyToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: env.AUTH0_AUDIENCE,
      issuer: `https://${env.AUTH0_DOMAIN}/`,
      algorithms: ["RS256"],
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded as jwt.JwtPayload);
    });
  });
}

function extractToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.substring(7);
}

async function attachUser(req: Request, auth0Id: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
  if (!user) return false;
  req.user = { id: user.id, auth0Id: user.auth0Id, role: user.role, email: user.email, username: user.username };
  return true;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) { res.status(401).json({ success: false, error: { message: "Authentication required" } }); return; }
    const decoded = await verifyToken(token);
    if (!decoded.sub) { res.status(401).json({ success: false, error: { message: "Invalid token" } }); return; }
    const found = await attachUser(req, decoded.sub);
    if (!found) { res.status(401).json({ success: false, error: { message: "User not found" } }); return; }
    next();
  } catch (err) {
    logger.error({ err }, "Auth error");
    res.status(401).json({ success: false, error: { message: "Invalid or expired token" } });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) { next(); return; }
    const decoded = await verifyToken(token);
    if (decoded.sub) await attachUser(req, decoded.sub);
  } catch {}
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ success: false, error: { message: "Authentication required" } }); return; }
    if (!roles.includes(req.user.role)) { res.status(403).json({ success: false, error: { message: "Insufficient permissions" } }); return; }
    next();
  };
};

export const requireReadingParticipant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) { res.status(401).json({ success: false, error: { message: "Authentication required" } }); return; }
  const readingId = parseInt(req.params.id);
  if (isNaN(readingId)) { res.status(400).json({ success: false, error: { message: "Invalid reading ID" } }); return; }
  const { readings } = await import("../../shared/src/schema.js");
  const [reading] = await db.select().from(readings).where(eq(readings.id, readingId)).limit(1);
  if (!reading) { res.status(404).json({ success: false, error: { message: "Reading not found" } }); return; }
  if (reading.clientId !== req.user.id && reading.readerId !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ success: false, error: { message: "Not a participant" } }); return;
  }
  (req as any).reading = reading;
  next();
};
