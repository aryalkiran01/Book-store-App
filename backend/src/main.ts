import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Client } from "@elastic/elasticsearch";

import { env } from "./utils/config";
import { createDBConnection } from "./utils/db";
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

// ElasticSearch Client
const client = new Client({
  node: "http://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USERNAME || "elastic",
    password: process.env.ELASTIC_PASSWORD || "HC0wbyx+ZDXiMVaUgpe*",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to Book Review App",
    data: null,
    isSuccess: true,
  });
});

// app.get("/search", async (req: Request, res: Response) => {
//   const { query } = req.query;

//   const searchQuery =
//     typeof query === "string" && query.trim()
//       ? {
//           multi_match: {
//             query: query.trim(),
//             fields: ["title", "content", "author"],
//           },
//         }
//       : { match_all: {} };

//   try {
//     const result = await client.search({
//       index: ["my_index", "document"],
//       body: { query: searchQuery },
//     });

//     res.json(result.hits.hits);
//   } catch (error: any) {
//     console.error("Search Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get("/my_index", async (req: Request, res: Response) => {
//   try {
//     const result = await client.search({
//       index: "my_index",
//       body: { query: { match_all: {} } },
//     });
//     res.json(result.hits.hits);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get("/document", async (req: Request, res: Response) => {
//   try {
//     const result = await client.search({
//       index: "document",
//       body: { query: { match_all: {} } },
//     });
//     res.json(result.hits.hits);
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

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
