import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { Client } from "@elastic/elasticsearch";

import { env } from "./utils/config";
import { APIError } from "./utils/error";
import { createDBConnection } from "./utils/db";
import { multerErrorHandler } from "./modules/auth/middleware";

import { authRouter } from "./modules/auth/router";
import { bookRouter } from "./modules/book/router";
import { reviewRouter } from "./modules/review/router";
import { orderRouter } from "./modules/order/router";
import paymentRoutes from "./modules/payment/router";

dotenv.config();

// Connect to Database
createDBConnection()
  .then(() => console.log("Database connected successfully"))
  .catch((error) => console.error("Database connection error:", error));

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://book-store-app-two-mu.vercel.app",
    ],
    credentials: true,
  })
);

// Elasticsearch Client Setup
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

app.get("/search", async (req: Request, res: Response) => {
  const { query } = req.query;

  const searchQuery =
    typeof query === "string" && query.trim()
      ? {
          multi_match: {
            query: query.trim(),
            fields: ["title", "content", "author"],
          },
        }
      : { match_all: {} };

  try {
    const result = await client.search({
      index: ["my_index", "document"],
      body: { query: searchQuery },
    });

    console.log("Elastic Search Results:", result.hits.hits);
    res.json(result.hits.hits);
  } catch (error: any) {
    console.error("Search Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/my_index", async (req: Request, res: Response) => {
  try {
    const result = await client.search({
      index: "my_index",
      body: { query: { match_all: {} } },
    });
    res.json(result.hits.hits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/document", async (req: Request, res: Response) => {
  try {
    const result = await client.search({
      index: "document",
      body: { query: { match_all: {} } },
    });
    res.json(result.hits.hits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/books", bookRouter);
app.use("/api/order", orderRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/payments", paymentRoutes);

// Global Error Handling
app.use(multerErrorHandler);
app.use((error: APIError, req: Request, res: Response, next: NextFunction) => {
  console.error(error);
  if (error instanceof APIError) {
    return res.status(error.status).json({
      message: error.message,
      data: null,
      isSuccess: false,
    });
  }
  res.status(500).json({
    message: "Internal server error",
    data: null,
    isSuccess: false,
  });
});

// Start Server
app.listen(env.PORT, () => {
  console.log(`Server started on: http://localhost:${env.PORT}`);
});
