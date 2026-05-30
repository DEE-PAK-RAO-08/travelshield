import xss from 'xss';
import { Request, Response, NextFunction } from 'express';

export function sanitizeInput(value: unknown): unknown {
  if (typeof value === 'string') return xss(value.trim());
  if (Array.isArray(value)) return value.map(sanitizeInput);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeInput(v)])
    );
  }
  return value;
}

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body) req.body = sanitizeInput(req.body) as typeof req.body;
  if (req.query) req.query = sanitizeInput(req.query) as typeof req.query;
  next();
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
