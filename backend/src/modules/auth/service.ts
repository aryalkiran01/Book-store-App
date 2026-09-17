import mongoose from "mongoose";
import {
  TChangePasswordInput,
  TLoginControllerInput,
  TRegisterControllerInput,
  TUpdateProfileInput,
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
import { OrderModel } from "../order/model";
import { ReviewModel } from "../review/model";
import { WishlistModel } from "../wishlist/model";
import { recordAdminAuditLog } from "../admin/audit.service";
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

export function formatUserProfile(user: any, statistics?: any, completion?: any) {
  const loc = user.location || {};
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    displayName:
      user.displayName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username,
    bio: user.bio || "",
    role: user.role || "user",
    avatar: user.avatar || "",
    phone: user.phone || "",
    location: {
      city: loc.city || "",
      district: loc.district || "",
      province: loc.province || "",
      country: loc.country || "Nepal",
    },
    address: user.address || "",
    isActive: user.isActive !== false,
    isEmailVerified: Boolean(user.isEmailVerified),
    memberSince: user.createdAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(statistics ? { statistics } : {}),
    ...(completion ? { completion } : {}),
  };
}

export function calculateProfileCompletion(user: any) {
  const loc = user.location || {};
  const steps = [
    {
      key: "username",
      label: "Username",
      completed: Boolean(user.username && user.username.trim().length >= 3),
    },
    {
      key: "name",
      label: "Full Name",
      completed: Boolean(
        user.displayName?.trim() ||
          user.firstName?.trim() ||
          user.lastName?.trim()
      ),
    },
    {
      key: "email",
      label: "Email Address",
      completed: Boolean(user.email && user.email.trim().length > 0),
    },
    {
      key: "phone",
      label: "Phone Number",
      completed: Boolean(user.phone && user.phone.trim().length >= 7),
    },
    {
      key: "location",
      label: "Location",
      completed: Boolean(loc.city?.trim() || loc.province?.trim() || loc.district?.trim()),
    },
    {
      key: "avatar",
      label: "Profile Photo",
      completed: Boolean(user.avatar && user.avatar.trim().length > 0),
    },
    {
      key: "address",
      label: "Street Address",
      completed: Boolean(user.address && user.address.trim().length > 0),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  return {
    percentage,
    completedCount,
    totalCount: steps.length,
    steps,
  };
}

export async function calculateUserStatistics(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [ordersCount, reviewsCount, wishlistDoc, purchasedAgg] =
    await Promise.all([
      OrderModel.countDocuments({
        userId: userObjectId,
        isDeleted: { $ne: true },
      }),
      ReviewModel.countDocuments({
        userId: userObjectId,
        status: { $ne: "hidden" },
      }),
      WishlistModel.findOne({ userId: userObjectId }),
      OrderModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            isDeleted: { $ne: true },
            status: { $nin: ["cancelled", "refunded"] },
          },
        },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } },
      ]),
    ]);

  const wishlistCount = wishlistDoc?.books?.length || 0;
  const booksPurchased = purchasedAgg[0]?.total || 0;

  return {
    orders: ordersCount,
    reviews: reviewsCount,
    wishlist: wishlistCount,
    booksPurchased,
  };
}

export async function getUserAccountSummaryService(userId: string) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  const [stats, completion] = await Promise.all([
    calculateUserStatistics(userId),
    Promise.resolve(calculateProfileCompletion(user)),
  ]);

  return formatUserProfile(user, stats, completion);
}

export async function checkUsernameAvailabilityService(
  username: string,
  currentUserId?: string
) {
  const cleanUsername = username.trim();
  if (!cleanUsername || cleanUsername.length < 3) {
    return { available: false, message: "Username must be at least 3 characters" };
  }

  const filter: any = {
    username: { $regex: `^${cleanUsername}$`, $options: "i" },
  };

  if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
  }

  const existing = await UserModel.findOne(filter);
  return {
    available: !existing,
    message: existing
      ? "Username is already taken"
      : "Username is available",
  };
}

export async function updateUserProfileService(
  userId: string,
  input: TUpdateProfileInput
) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  const changesTracked: string[] = [];

  // Username update & uniqueness check
  if (input.username && input.username.trim() !== user.username) {
    const cleanUsername = input.username.trim();
    const existing = await UserModel.findOne({
      username: { $regex: `^${cleanUsername}$`, $options: "i" },
      _id: { $ne: user._id },
    });
    if (existing) {
      throw APIError.conflict("Username is already taken by another account");
    }
    changesTracked.push(`username changed from ${user.username} to ${cleanUsername}`);
    user.username = cleanUsername;
  }

  if (input.firstName !== undefined) {
    user.firstName = input.firstName.trim();
  }
  if (input.lastName !== undefined) {
    user.lastName = input.lastName.trim();
  }
  if (input.displayName !== undefined) {
    user.displayName = input.displayName.trim();
  }
  if (input.bio !== undefined) {
    user.bio = input.bio.trim();
  }
  if (input.phone !== undefined) {
    user.phone = input.phone.trim();
  }
  if (input.address !== undefined) {
    user.address = input.address.trim();
  }
  if (input.avatar !== undefined) {
    user.avatar = input.avatar.trim();
  }

  if (input.location) {
    const currentLoc: any = user.location || {};
    user.location = {
      city: input.location.city !== undefined ? input.location.city.trim() : (currentLoc.city || ""),
      district: input.location.district !== undefined ? input.location.district.trim() : (currentLoc.district || ""),
      province: input.location.province !== undefined ? input.location.province.trim() : (currentLoc.province || ""),
      country: input.location.country !== undefined ? input.location.country.trim() : (currentLoc.country || "Nepal"),
    };
  }


  await user.save();

  // Audit logging
  if (changesTracked.length > 0) {
    recordAdminAuditLog({
      adminId: user._id.toString(),
      adminUsername: user.username,
      action: "UPDATE_PROFILE",
      targetType: "User",
      targetId: user._id.toString(),
      details: { changes: changesTracked },
    });
  }

  const [stats, completion] = await Promise.all([
    calculateUserStatistics(userId),
    Promise.resolve(calculateProfileCompletion(user)),
  ]);

  return formatUserProfile(user, stats, completion);
}

export async function removeAvatarService(userId: string) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  user.avatar = "";
  await user.save();

  const [stats, completion] = await Promise.all([
    calculateUserStatistics(userId),
    Promise.resolve(calculateProfileCompletion(user)),
  ]);

  return formatUserProfile(user, stats, completion);
}


export async function requestEmailChangeService(userId: string, newEmail: string) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  const normalizedEmail = newEmail.toLowerCase().trim();
  if (normalizedEmail === user.email.toLowerCase()) {
    throw APIError.badRequest("New email must be different from your current email");
  }

  const existing = await UserModel.findOne({
    email: normalizedEmail,
    _id: { $ne: user._id },
  });
  if (existing) {
    throw APIError.conflict("Email address is already in use by another account");
  }

  const rawToken = generateCryptoToken(32);
  user.pendingEmail = normalizedEmail;
  user.pendingEmailVerificationTokenHash = hashCryptoToken(rawToken);
  user.pendingEmailExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  return {
    message: "A verification code has been sent to your new email address.",
    ...(env.NODE_ENV !== "production" ? { verificationToken: rawToken } : {}),
  };
}

export async function verifyEmailChangeService(userId: string, token: string) {
  validateObjectId(userId, "User ID");
  const tokenHash = hashCryptoToken(token.trim());

  const user = await UserModel.findOne({
    _id: userId,
    pendingEmailVerificationTokenHash: tokenHash,
    pendingEmailExpiresAt: { $gt: new Date() },
    isDeleted: { $ne: true },
  });

  if (!user || !user.pendingEmail) {
    throw APIError.badRequest("Invalid or expired email change verification token.");
  }

  // Double check if pendingEmail was taken in the meantime
  const conflict = await UserModel.findOne({
    email: user.pendingEmail,
    _id: { $ne: user._id },
  });
  if (conflict) {
    throw APIError.conflict("Email address is now taken by another account");
  }

  user.email = user.pendingEmail;
  user.pendingEmail = "";
  user.pendingEmailVerificationTokenHash = "";
  user.pendingEmailExpiresAt = undefined as any;
  user.isEmailVerified = true;
  user.sessionVersion = (user.sessionVersion || 1) + 1; // Invalidate previous session tokens for safety
  await user.save();

  const newToken = generateToken({
    id: user._id.toString(),
    sub: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role as "admin" | "user",
    sessionVersion: user.sessionVersion,
  });

  return {
    message: "Email address successfully updated and verified.",
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      isEmailVerified: true,
    },
    token: newToken,
  };
}

export async function logoutAllSessionsService(userId: string) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  user.sessionVersion = (user.sessionVersion || 1) + 1;
  await user.save();

  return {
    message: "All active sessions have been invalidated. Please log in again.",
  };
}

export async function deleteAccountService(userId: string, passwordConfirmation: string) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user || user.isDeleted) {
    throw APIError.notFound("User not found");
  }

  const isMatch = await comparePassword(passwordConfirmation, user.password);
  if (!isMatch) {
    throw APIError.badRequest("Invalid password. Account deletion cancelled.");
  }

  user.isDeleted = true;
  user.isActive = false;
  user.deletedAt = new Date();
  user.sessionVersion = (user.sessionVersion || 1) + 1; // Immediately invalidate all tokens
  await user.save();

  return {
    message: "Account has been successfully deleted.",
  };
}


