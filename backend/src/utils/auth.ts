import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { env } from "./config";

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

export type TTokenPayload = {
  id: string;
  username: string;
  email: string;
  role: TUserRole;
};

const secretKey = env.JWT_SECRET;
if (!secretKey && process.env.NODE_ENV === "production") {
  throw new Error("CRITICAL: JWT_SECRET environment variable is missing in production!");
}

export function generateToken(payload: TTokenPayload): string {
  const token = jwt.sign(payload, secretKey, {
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

