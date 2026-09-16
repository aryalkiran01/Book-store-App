import { config } from "dotenv";
import path from "path";

config();

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/book_review_app_db";
const rawJwtSecret = process.env.JWT_SECRET?.trim();
const MIN_JWT_SECRET_LENGTH = 32;

if (NODE_ENV === "production") {
  if (!rawJwtSecret) {
    throw new Error(
      "CRITICAL: JWT_SECRET environment variable is missing in production! Please set a strong random secret with at least 32 characters in your environment."
    );
  }
  if (rawJwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `CRITICAL: JWT_SECRET is too short (${rawJwtSecret.length} chars). Production requires a minimum length of ${MIN_JWT_SECRET_LENGTH} characters.`
    );
  }
  if (
    rawJwtSecret === "supersecretjwtkey_bookreviewapp_2025_secure" ||
    rawJwtSecret.includes("replace_with") ||
    rawJwtSecret.includes("placeholder")
  ) {
    throw new Error(
      "CRITICAL: Insecure default or placeholder JWT_SECRET detected in production! You must generate a cryptographically random secret."
    );
  }
}

// In development or test, if JWT_SECRET is missing, provide a clear dev-only key with security notice
const JWT_SECRET =
  rawJwtSecret ||
  (NODE_ENV !== "production"
    ? "dev_jwt_secret_key_minimum_32_characters_strictly_for_local_testing_only"
    : "");

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
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE?.trim() || (ESEWA_TEST_MODE ? "EPAYTEST" : "");
const ESEWA_SECRET_KEY = (process.env.ESEWA_SECRET_KEY || "").trim();
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

const GOOGLE_BOOKS_API_KEY = (process.env.GOOGLE_BOOKS_API_KEY || "").trim();
const GOOGLE_BOOKS_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.GOOGLE_BOOKS_TIMEOUT_MS) || 7000
);
const OPEN_LIBRARY_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.OPEN_LIBRARY_TIMEOUT_MS) || 7000
);

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

export function isEsewaConfigured(secret: string = ESEWA_SECRET_KEY): boolean {
  if (!secret) return false;
  const s = secret.trim().toLowerCase();
  if (
    !s ||
    s.startsWith("your_") ||
    s.startsWith("replace_") ||
    s.startsWith("placeholder") ||
    s.includes("example")
  ) {
    return false;
  }
  return s.length >= 8;
}

export const env = {
  NODE_ENV,
  PORT,
  MONGO_URI,
  JWT_SECRET,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  GOOGLE_BOOKS_API_KEY,
  GOOGLE_BOOKS_TIMEOUT_MS,
  OPEN_LIBRARY_TIMEOUT_MS,
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



