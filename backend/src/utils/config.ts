import { config } from "dotenv";
import path from "path";

config();

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/book_review_app_db";
const JWT_SECRET =
  process.env.JWT_SECRET || "supersecretjwtkey_bookreviewapp_2025_secure";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "";
const KHALTI_API_KEY =
  process.env.KHALTI_API_KEY ||
  "test_secret_key_684f8841a134440092305a2e6462700a";
const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads/";

const SEED_DB =
  process.env.SEED_DB === "true" ||
  (NODE_ENV !== "production" && process.env.SEED_DB !== "false");
const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || "";
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "";
const INITIAL_ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME || "Admin";

if (NODE_ENV === "production" && JWT_SECRET === "supersecretjwtkey_bookreviewapp_2025_secure") {
  console.warn(
    "⚠️ [SECURITY WARNING] Default JWT_SECRET is being used in production. Please set a strong random JWT_SECRET in your production .env file."
  );
}

export const env = {
  NODE_ENV,
  PORT,
  MONGO_URI,
  JWT_SECRET,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  KHALTI_API_KEY,
  UPLOADS_DIR,
  SEED_DB,
  INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_PASSWORD,
  INITIAL_ADMIN_USERNAME,
} as const;


