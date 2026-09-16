import {
  TChangePasswordInput,
  TLoginControllerInput,
  TRegisterControllerInput,
  TUpdateRolecontrollerInput,
} from "./validation";
import {
  comparePassword,
  generateCryptoToken,
  generateToken,
  hashCryptoToken,
  hashPassword,
} from "../../utils/auth";
import { APIError } from "../../utils/error";
import { UserModel } from "./model";
import { validateObjectId } from "../../utils/security";
import { env } from "../../utils/config";

export async function createUserService(input: TRegisterControllerInput) {
  const { email, username, password } = input;

  const existingEmail = await UserModel.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw APIError.conflict("An account with this email already exists");
  }

  const existingUsername = await UserModel.findOne({ username });
  if (existingUsername) {
    throw APIError.conflict("An account with this username already exists");
  }

  const hashedPassword = await hashPassword(password);

  const newUser = new UserModel({
    email: email.toLowerCase(),
    username,
    password: hashedPassword,
    role: "user", // Default always user - never allow privilege escalation on signup
    sessionVersion: 1,
    isActive: true,
    isEmailVerified: false,
  });

  await newUser.save();

  return newUser;
}

export async function loginService(input: TLoginControllerInput) {
  const { email, password } = input;
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user || user.isDeleted) {
    throw APIError.unauthorized("Invalid email or password");
  }

  if (user.isActive === false) {
    throw APIError.forbidden("Your account is deactivated or suspended. Please contact support.");
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw APIError.unauthorized("Invalid email or password");
  }

  const sessionVersion = user.sessionVersion || 1;

  const token = generateToken({
    id: user._id.toString(),
    sub: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role as "admin" | "user",
    sessionVersion,
  });

  return {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
    },
    token,
  };
}

export async function getUserById(id: string) {
  validateObjectId(id, "User ID");
  const user = await UserModel.findById(id).select("-password");
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  return user;
}

export async function changePasswordService(
  userId: string,
  input: TChangePasswordInput
) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  const isMatch = await comparePassword(input.oldPassword, user.password);
  if (!isMatch) {
    throw APIError.badRequest("Current password is incorrect");
  }

  const hashedNew = await hashPassword(input.newPassword);
  user.password = hashedNew;
  // Invalidate all other active sessions
  user.sessionVersion = (user.sessionVersion || 1) + 1;
  await user.save();

  // Issue fresh token for current session
  const newToken = generateToken({
    id: user._id.toString(),
    sub: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role as "admin" | "user",
    sessionVersion: user.sessionVersion,
  });

  return {
    success: true,
    token: newToken,
  };
}

export async function forgotPasswordService(email: string) {
  const user = await UserModel.findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
    isDeleted: { $ne: true },
  });

  let rawToken = "";
  if (user) {
    rawToken = generateCryptoToken(32);
    user.passwordResetTokenHash = hashCryptoToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration
    await user.save();
  }

  return {
    message: "If an account with that email exists, password reset instructions have been generated.",
    // Expose reset token strictly in non-production/test environments for automated testing
    ...(env.NODE_ENV !== "production" && rawToken ? { resetToken: rawToken } : {}),
  };
}

export async function resetPasswordService(token: string, newPassword: string) {
  const tokenHash = hashCryptoToken(token.trim());

  const user = await UserModel.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
    isDeleted: { $ne: true },
  });

  if (!user) {
    throw APIError.badRequest("Invalid or expired password reset token. Please request a new one.");
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetTokenHash = "";
  user.passwordResetExpiresAt = undefined as any;
  // Invalidate all previous sessions
  user.sessionVersion = (user.sessionVersion || 1) + 1;
  await user.save();

  return {
    message: "Password has been successfully reset. Please log in with your new password.",
  };
}

export async function sendEmailVerificationService(userId: string) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  if (user.isEmailVerified) {
    return {
      message: "Your email address is already verified.",
      alreadyVerified: true,
    };
  }

  const rawToken = generateCryptoToken(32);
  user.emailVerificationTokenHash = hashCryptoToken(rawToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  return {
    message: "Email verification link has been sent.",
    ...(env.NODE_ENV !== "production" ? { verificationToken: rawToken } : {}),
  };
}

export async function verifyEmailService(token: string) {
  const tokenHash = hashCryptoToken(token.trim());

  const user = await UserModel.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
    isDeleted: { $ne: true },
  });

  if (!user) {
    throw APIError.badRequest("Invalid or expired email verification token.");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = "";
  user.emailVerificationExpiresAt = undefined as any;
  await user.save();

  return {
    message: "Your email address has been verified successfully.",
    user: {
      id: user._id.toString(),
      email: user.email,
      isEmailVerified: true,
    },
  };
}

export async function logoutService() {
  return true;
}

export async function updateroleservice(input: TUpdateRolecontrollerInput) {
  validateObjectId(input.userId, "Target User ID");
  const user = await UserModel.findById(input.userId);
  if (!user) {
    throw APIError.notFound("Target user not found");
  }
  user.role = input.userRole;
  user.sessionVersion = (user.sessionVersion || 1) + 1; // Invalidate current session to force role refresh
  await user.save();
  return user;
}

