import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try { req.body = schema.parse(req.body); next(); }
  catch (err) {
    if (err instanceof ZodError) { res.status(400).json({ success: false, error: { message: "Validation failed", details: err.errors } }); return; }
    next(err);
  }
};

export const validateQuery = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try { (req as any).validatedQuery = schema.parse(req.query); next(); }
  catch (err) {
    if (err instanceof ZodError) { res.status(400).json({ success: false, error: { message: "Invalid query params", details: err.errors } }); return; }
    next(err);
  }
};
