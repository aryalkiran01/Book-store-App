import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { env } from "./utils/config";
import { APIError } from "./utils/error";
import { authRouter } from "./modules/auth/router";
import cookieParser from "cookie-parser";
import { createDBConnection } from "./utils/db";
import { bookRouter } from "./modules/book/router";
import { reviewRouter } from "./modules/review/router";
import { multerErrorHandler } from "./modules/auth/middleware";
// const { Client } = require("@elastic/elasticsearch");
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import { match } from "assert";
import { error } from "console";
import { orderRouter } from "./modules/order/router";
import paymentRoutes from "./modules/payment/router";
dotenv.config();

createDBConnection()
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173","https://book-review-app-lhw4-mzzozc4dm-aryalkiran21s-projects.vercel.app"],

    credentials: true,
  })
);
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

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.json({
    message: "Welcome to Book Review App",
    data: null,
    isSuccess: true,
  });
});

app.get("/search", async (req: Request, res: Response) => {
  let { query } = req.query;

  // Ensure query is a string
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

    console.log("Elastic Search is running", result.hits.hits);
    res.json(result.hits.hits);
  } catch (error: any) {
    console.error("Search Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// app.get("/search", async (req: Request, res: Response) => {
//   let { query } = req.query;

//   // Ensure query exists and is a string
//   if (!query || typeof query !== "string") {
//     return res
//       .status(400)
//       .json({ error: "Query parameter must be a non-empty string" });
//   }

//   query = query.trim();
//   if (!query) {
//     return res.json([]); // Return empty array if query is just whitespace
//   }

//   const searchQuery = {
//     multi_match: {
//       query,
//       fields: ["title", "content", "author"], // Correct field names
//       // type: "phrase" // You can use "phrase" or remove this field
//     },
//   };

//   try {
//     const result = await client.search({
//       index: "my_index", // Ensure this index exists
//       body: { query: searchQuery },
//     });

//     console.log("Elasticsearch Results:", result.hits.hits);
//     res.json(result.hits.hits);
//   } catch (error: any) {
//     console.error("Search Error:", error.meta?.body?.error || error.message);
//     res.status(500).json({ error: error.meta?.body?.error || error.message });
//   }
// });

// // Fetch all data from my_index
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

// // Fetch all data from document
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

// authentication routes
app.use("/api/auth", authRouter);

// book routes
app.use("/api/books", bookRouter);

//order routes
app.use("/api/order", orderRouter);

// review routes
app.use("/api/reviews", reviewRouter);

app.use("/api/payments", paymentRoutes);

// Error Handling Middleware (Including Multer Errors)
app.use(multerErrorHandler); // Global error handler for file uploads
app.use((error: APIError, req: Request, res: Response, next: NextFunction) => {
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
});

app.listen(env.PORT, () =>
  console.log(`Server started on: http://localhost:${env.PORT}`)
);
