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

import { seedDatabase } from "./utils/seed";

// Connect to MongoDB
createDBConnection()
  .then(async () => {
    console.log("Database connected successfully");
    await seedDatabase();
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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://book-store-app-two-mu.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev
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

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    isSuccess: true,
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

app.listen(env.PORT, () =>
  console.log(`Server started on: http://localhost:${env.PORT}`)
);
