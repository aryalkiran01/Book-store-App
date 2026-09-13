import { config } from "dotenv";
import path from "path";

config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 4000,
  MONGO_URI:
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/book_review_app_db",
  JWT_SECRET:
    process.env.JWT_SECRET || "supersecretjwtkey_bookreviewapp_2025_secure",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  KHALTI_API_KEY:
    process.env.KHALTI_API_KEY ||
    "test_secret_key_684f8841a134440092305a2e6462700a",
  UPLOADS_DIR: process.env.UPLOADS_DIR || "uploads/",
} as const;

