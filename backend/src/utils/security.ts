import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { APIError } from "./error";

/**
 * Validates that an ID string is a valid MongoDB ObjectId.
 * Prevents NoSQL cast errors and malicious injection payloads.
 */
export function validateObjectId(id: string, fieldName = "ID"): void {
  if (!id || typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
    throw APIError.badRequest(`Invalid ${fieldName} format`);
  }
}

/**
 * Basic HTML/script tag stripping to prevent stored and reflected XSS.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Deep sanitization for request parameters and body to eliminate MongoDB operator injection ($gt, $ne, $where, etc.)
 */
export function sanitizeNoSqlInput(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    if (typeof obj === "string") {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSqlInput);
  }

  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    // Prohibit keys that start with $ (MongoDB query operators) or contain dots
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    sanitized[key] = sanitizeNoSqlInput(obj[key]);
  }
  return sanitized;
}

/**
 * Middleware that automatically sanitizes req.body, req.query, and req.params
 */
export function sanitizeInputMiddleware(req: any, res: any, next: any) {
  if (req.body) {
    req.body = sanitizeNoSqlInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeNoSqlInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeNoSqlInput(req.params);
  }
  next();
}

/**
 * Rate Limiter for Authentication routes to prevent brute-force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 20 : 5000,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication requests. Please try again after 15 minutes.",
    isSuccess: false,
    data: null,
  },
});

/**
 * Rate Limiter for General API routes
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 500 : 10000,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please slow down.",
    isSuccess: false,
    data: null,
  },
});

/**
 * Rate Limiter for Checkout and Payment transactions
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 30 : 5000,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many checkout requests. Please try again after 15 minutes.",
    isSuccess: false,
    data: null,
  },
});

/**
 * Rate Limiter for Search & Discovery routes
 */
export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 60 : 5000,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many search requests. Please slow down.",
    isSuccess: false,
    data: null,
  },
});

/**
 * CSRF and Origin validation middleware for state-modifying requests
 */
export function createCsrfProtectionMiddleware(allowedOriginsList: string[]) {
  const allowedSet = new Set(allowedOriginsList.filter(Boolean));

  return (req: any, res: any, next: any) => {
    // Safe HTTP methods do not modify server state
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    const origin = req.headers["origin"] || "";
    const referer = req.headers["referer"] || "";

    // In production, validate Origin or Referer against allowed whitelist
    if (process.env.NODE_ENV === "production") {
      if (origin) {
        if (!allowedSet.has(origin)) {
          return res.status(403).json({
            message: "CSRF Guard: Cross-Origin state modification prohibited.",
            isSuccess: false,
            data: null,
          });
        }
      } else if (referer) {
        try {
          const refererOrigin = new URL(referer).origin;
          if (!allowedSet.has(refererOrigin)) {
            return res.status(403).json({
              message: "CSRF Guard: Cross-Origin state modification prohibited.",
              isSuccess: false,
              data: null,
            });
          }
        } catch {
          return res.status(403).json({
            message: "CSRF Guard: Malformed Referer header.",
            isSuccess: false,
            data: null,
          });
        }
      }
    }

    next();
  };
}
