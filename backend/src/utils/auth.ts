import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { env } from "./config";

import crypto from "crypto";

export type TUserRole = "admin" | "user";

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || !hashedPassword) return false;
  const isCompared = await bcrypt.compare(password, hashedPassword);
  return isCompared;
}

export function generateCryptoToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

export function hashCryptoToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type TTokenPayload = {
  sub?: string;
  id: string;
  username: string;
  email: string;
  role: TUserRole;
  sessionVersion: number;
};

const secretKey = env.JWT_SECRET;
if (!secretKey && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: JWT_SECRET environment variable is missing in production!");
}

export function generateToken(payload: TTokenPayload): string {
  const tokenPayload = {
    sub: payload.id || payload.sub,
    id: payload.id || payload.sub,
    username: payload.username,
    email: payload.email,
    role: payload.role || "user",
    sessionVersion: payload.sessionVersion ?? 1,
  };

  const token = jwt.sign(tokenPayload, secretKey, {
    expiresIn: "7d", // 7 days expiration
  });
  return token;
}

export function verifyToken(token: string) {
  try {
    const verified = jwt.verify(token, secretKey);
    return {
      isValid: true,
      message: "Token verified successfully",
      payload: verified as TTokenPayload,
    };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return {
        isValid: false,
        message: "Your session has expired. Please log in again.",
        payload: null,
      };
    } else if (error instanceof JsonWebTokenError) {
      return {
        isValid: false,
        message: "Invalid session token. Please log in again.",
        payload: null,
      };
    }
    return {
      isValid: false,
      message: "Session authentication failed.",
      payload: null,
    };
  }
}

