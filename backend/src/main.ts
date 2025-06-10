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
import { multerErrorHandler } from "./modules/auth/middleware";

dotenv.config();

// Connect to MongoDB
createDBConnection()
  .then(() => console.log("Database connected successfully"))
  .catch((error) => console.error("Database connection error:", error));

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://book-store-app-two-mu.vercel.app",
    ],
    credentials: true,
  })
);

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to Book Review App",
    data: null,
    isSuccess: true,
  });
});
// API Routes
app.use("/api/auth", authRouter);
app.use("/api/books", bookRouter);
app.use("/api/order", orderRouter);
app.use("/api/reviews", reviewRouter);
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
  console.error(error);

  if (error instanceof APIError) {
    res.status(error.status).json({
      message: error.message,
      data: null,
      isSuccess: false,
    });
    return;
  }

  res.status(500).json({
    message: "Internal server error",
    data: null,
    isSuccess: false,
  });
};

app.listen(env.PORT, () =>
  console.log(`Server started on: http://localhost:${env.PORT}`)
);
