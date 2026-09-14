import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { env } from "./utils/config.js";
import { createDBConnection } from "./utils/db.js";
import { APIError } from "./utils/error";

import { authRouter } from "./modules/auth/router";
import { bookRouter } from "./modules/book/router";
import { reviewRouter } from "./modules/review/router";
import { orderRouter } from "./modules/order/router";
import paymentRoutes from "./modules/payment/router";
import { adminRouter } from "./modules/admin/router";
import { multerErrorHandler } from "./modules/auth/middleware";

dotenv.config();

import { seedDatabase, initializeProductionAdmin } from "./utils/seed";

// Connect to MongoDB
createDBConnection()
  .then(async () => {
    console.log("Database connected successfully");
    if (env.NODE_ENV !== "production" && env.SEED_DB) {
      await seedDatabase();
    } else if (env.NODE_ENV === "production") {
      await initializeProductionAdmin();
    }
  })
  .catch((error) => console.error("Database connection error:", error));


import helmet from "helmet";
import { apiRateLimiter, sanitizeInputMiddleware } from "./utils/security";

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Allow frontend flexibility while protecting core headers
  })
);

// Body parser with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Sanitize inputs against NoSQL injection and basic XSS
app.use(sanitizeInputMiddleware);

app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

const configuredOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://book-store-app-two-mu.vercel.app",
  env.FRONTEND_URL,
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins])).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or server-to-server curl)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV !== "production" &&
          (/^http:\/\/localhost:\d+$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)))
      ) {
        return callback(null, true);
      }

      if (env.NODE_ENV === "production") {
        return callback(APIError.forbidden("CORS policy does not allow access from this origin."));
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

// Apply rate limiting on all API routes
app.use("/api", apiRateLimiter);

// Health check & welcome
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to Book Review App API",
    data: null,
    isSuccess: true,
  });
});

import mongoose from "mongoose";

app.get("/api/health", (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    database: dbStatusMap[dbState] || "unknown",
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    isSuccess: isHealthy,
  });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/books", bookRouter);
app.use("/api/order", orderRouter);
app.use("/api/orders", orderRouter); // Alias for plural
app.use("/api/reviews", reviewRouter);
app.use("/api/review", reviewRouter); // Alias for singular
app.use("/api/payments", paymentRoutes);

// Multer-specific error handler
app.use(multerErrorHandler);

// Global Error Handler
const globalErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): void => {
  // Log full error details securely on the server
  console.error(`[Error] ${req.method} ${req.url}:`, {
    name: error?.name,
    status: error?.status,
    message: error?.message,
    isInstance: error instanceof APIError,
  });

  const statusCode =
    typeof error?.status === "number"
      ? error.status
      : error instanceof APIError
      ? error.status
      : null;

  if (statusCode) {
    res.status(statusCode).json({
      message: error.message || "An error occurred",
      data: null,
      isSuccess: false,
    });
    return;
  }

  // Handle Mongoose CastError / ValidationError safely
  if (error.name === "CastError") {
    res.status(400).json({
      message: "Invalid resource identifier format",
      data: null,
      isSuccess: false,
    });
    return;
  }

  if (error.name === "ValidationError") {
    res.status(400).json({
      message: "Database validation error",
      data: null,
      isSuccess: false,
    });
    return;
  }

  // Never leak internal stack traces, connection strings, or query internals to clients
  res.status(500).json({
    message: "An internal server error occurred. Please try again later.",
    data: null,
    isSuccess: false,
  });
};

app.use(globalErrorHandler);

const server = app.listen(env.PORT, () =>
  console.log(`Server started on: http://localhost:${env.PORT}`)
);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      await mongoose.connection.close(false);
      console.log("MongoDB connection closed.");
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

