import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import { env } from "../config/env.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * A small in-process limit that protects a single Azure VM without adding a
 * runtime dependency. Replace it with a shared store when the API is scaled
 * to multiple instances.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || "unknown";
    const existing = entries.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    entry.count += 1;
    entries.set(key, entry);

    response.setHeader("RateLimit-Limit", String(max));
    response.setHeader("RateLimit-Remaining", String(Math.max(max - entry.count, 0)));
    response.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      response.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      next(new AppError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED"));
      return;
    }

    if (entries.size > env.rateLimitMaxTrackedClients) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= now) {
          entries.delete(entryKey);
        }
      }
    }

    next();
  };
}
