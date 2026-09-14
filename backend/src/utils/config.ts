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
const KHALTI_SECRET_KEY =
  (process.env.KHALTI_SECRET_KEY || process.env.KHALTI_API_KEY || "").trim();
const KHALTI_TEST_MODE = process.env.KHALTI_TEST_MODE !== "false";
const KHALTI_INITIATE_URL =
  process.env.KHALTI_INITIATE_URL ||
  "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL =
  process.env.KHALTI_LOOKUP_URL ||
  "https://dev.khalti.com/api/v2/epayment/lookup/";

const ESEWA_TEST_MODE = process.env.ESEWA_TEST_MODE !== "false";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_INITIATE_URL =
  process.env.ESEWA_INITIATE_URL ||
  "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_STATUS_CHECK_URL =
  process.env.ESEWA_STATUS_CHECK_URL ||
  "https://rc-epay.esewa.com.np/api/epay/transaction/status/";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads/";

const SEED_DB =
  NODE_ENV !== "production" &&
  (process.env.SEED_DB === "true" || process.env.ALLOW_DEV_SEED === "true");
const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || "";
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "";
const INITIAL_ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME || "Admin";

if (NODE_ENV === "production" && JWT_SECRET === "supersecretjwtkey_bookreviewapp_2025_secure") {
  console.warn(
    "⚠️ [SECURITY WARNING] Default JWT_SECRET is being used in production. Please set a strong random JWT_SECRET in your production .env file."
  );
}

export function isKhaltiConfigured(secret: string = KHALTI_SECRET_KEY): boolean {
  if (!secret) return false;
  const s = secret.trim().toLowerCase();
  if (
    !s ||
    s.startsWith("your_") ||
    s.startsWith("replace_") ||
    s.startsWith("placeholder") ||
    s.startsWith("my_real_") ||
    s.includes("example") ||
    s === "test_secret_key"
  ) {
    return false;
  }
  return s.length >= 10;
}

export const env = {
  NODE_ENV,
  PORT,
  MONGO_URI,
  JWT_SECRET,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  KHALTI_API_KEY: KHALTI_SECRET_KEY,
  KHALTI_SECRET_KEY,
  KHALTI_TEST_MODE,
  KHALTI_INITIATE_URL,
  KHALTI_LOOKUP_URL,
  ESEWA_TEST_MODE,
  ESEWA_PRODUCT_CODE,
  ESEWA_SECRET_KEY,
  ESEWA_INITIATE_URL,
  ESEWA_STATUS_CHECK_URL,
  UPLOADS_DIR,
  SEED_DB,
  INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_PASSWORD,
  INITIAL_ADMIN_USERNAME,
} as const;


