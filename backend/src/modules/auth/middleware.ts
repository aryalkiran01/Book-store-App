import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { TTokenPayload, verifyToken } from "../../utils/auth";
import { UserModel } from "./model";
import { APIError } from "../../utils/error";
import { env } from "../../utils/config";

// ------------------------- TYPE DECLARATIONS -------------------------
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        username: string;
        email: string;
        role: "admin" | "user";
        avatar?: string;
        isActive?: boolean;
        isEmailVerified?: boolean;
        sessionVersion?: number;
      };
    }
  }
}

// ------------------------- AUTHENTICATION MIDDLEWARE -------------------------
export async function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.token as string;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        message: "You are not logged in!",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const verifyTokenOutput = verifyToken(token);

    if (!verifyTokenOutput.isValid || !verifyTokenOutput.payload) {
      res.status(401).json({
        message: verifyTokenOutput.message || "Invalid or expired session token. Please log in again.",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const payload = verifyTokenOutput.payload as TTokenPayload;
    const userId = payload.sub || payload.id;

    if (!userId) {
      res.status(401).json({
        message: "Invalid token payload.",
        isSuccess: false,
        data: null,
      });
      return;
    }

    // Live Database Verification: Confirm user exists, is active, and sessionVersion is current
    const user = await UserModel.findById(userId).lean();

    if (!user || user.isDeleted) {
      res.status(401).json({
        message: "Your account could not be found. Please log in again.",
        isSuccess: false,
        data: null,
      });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({
        message: "Your account has been deactivated or suspended. Please contact support.",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const expectedSessionVersion = user.sessionVersion ?? 1;
    const tokenSessionVersion = payload.sessionVersion ?? 1;

    if (tokenSessionVersion !== expectedSessionVersion) {
      res.status(401).json({
        message: "Session has been invalidated due to a security update or password change. Please log in again.",
        isSuccess: false,
        data: null,
      });
      return;
    }

    // Attach verified user information directly from the fresh DB record
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role as "admin" | "user",
      avatar: user.avatar || "",
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      sessionVersion: user.sessionVersion,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      message: "Internal server error during authentication",
      isSuccess: false,
      data: null,
    });
  }
}

export const requireAuth = checkAuth;

// ------------------------- AUTHORIZATION MIDDLEWARE -------------------------
export async function checkAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({
        message: "Forbidden: Admin privileges required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).json({
      message: "Internal server error during authorization",
      isSuccess: false,
      data: null,
    });
  }
}

export const requireAdmin = checkAdmin;

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Authentication required",
          isSuccess: false,
          data: null,
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          message: "Unauthorized: Required role not granted",
          isSuccess: false,
          data: null,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({
        message: "Internal server error during role check",
        isSuccess: false,
        data: null,
      });
    }
  };
}


// ------------------------- CUSTOM MIDDLEWARE TYPES -------------------------
interface MulterError extends Error {
  code: string;
  field?: string;
}

// ------------------------- FILE UPLOAD MIDDLEWARE -------------------------
import fs from "fs";

const uploadsDir = process.env.UPLOADS_DIR || "uploads/";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize extension and base filename to prevent path traversal
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const cleanFieldName = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanFieldName}-${uniqueSuffix}${safeExt}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
    files: 1, // Max 1 file per upload request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpeg, .jpg, .png, and .webp image files are allowed!"));
    }
  },
});

// ------------------------- ERROR HANDLING FOR MULTER -------------------------
export const multerErrorHandler = (
  err: MulterError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return void res.status(400).json({
          message: "File is too large. Maximum size is 5MB",
          isSuccess: false,
          data: null,
        });
      case "LIMIT_UNEXPECTED_FILE":
        return void res.status(400).json({
          message: "Unexpected field in file upload",
          isSuccess: false,
          data: null,
        });
      default:
        return void res.status(400).json({
          message: err.message,
          isSuccess: false,
          data: null,
        });
    }
  } else if (err && err.message && err.message.includes("image files are allowed")) {
    return void res.status(400).json({
      message: err.message,
      isSuccess: false,
      data: null,
    });
  } else if (err) {
    return next(err); // Pass non-multer errors to globalErrorHandler
  }

  next();
};

// ------------------------- TYPE GUARD FUNCTIONS -------------------------
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Ensure the return type is `any`
  if (!req.user) {
    return void res.status(401).json({
      message: "Authentication required",
      isSuccess: false,
      data: null,
    });
  }
  next(); // Pass control to the next middleware
}

// ------------------------- ROLE-BASED MIDDLEWARE -------------------------
export function checkRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure the return type is `any`
    try {
      if (!req.user) {
        return void res.status(401).json({
          message: "Authentication required",
          isSuccess: false,
          data: null,
        });
      }

      if (!roles.includes(req.user.role)) {
        return void res.status(403).json({
          message: "Unauthorized: Required role not found",
          isSuccess: false,
          data: null,
        });
      }

      next(); // Pass control to the next middleware
    } catch (error) {
      console.error("Role check error:", error);
      return void res.status(500).json({
        message: "Internal server error during role check",
        isSuccess: false,
        data: null,
      });
    }
  };
}
