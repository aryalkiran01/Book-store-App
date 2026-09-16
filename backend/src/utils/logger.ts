import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface StructuredLogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  url: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  userId?: string;
  errorMessage?: string;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId = req.headers["x-request-id"];
  const requestId = (typeof existingId === "string" && existingId.trim()) 
    ? existingId 
    : crypto.randomUUID();

  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  res.on("finish", () => {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const isHealthCheck = req.path.startsWith("/health") || req.path === "/api/health";

    // Skip verbose logging for high frequency health probes in production
    if (isHealthCheck && process.env.NODE_ENV === "production") {
      return;
    }

    const logEntry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      requestId: (req as any).id || "unknown",
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get("user-agent") || "unknown",
      userId: (req as any).user?.id || (req as any).user?.userId,
    };

    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: "error", ...logEntry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: "warn", ...logEntry }));
    } else if (process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify({ level: "info", ...logEntry }));
    }
  });

  next();
}
