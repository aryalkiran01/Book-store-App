import { z } from "zod";

export const RegisterControllerSchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_ -]+$/, "Username can only contain alphanumeric characters, dashes, and underscores")
    .trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});
export type TRegisterControllerInput = z.TypeOf<
  typeof RegisterControllerSchema
>;

export const LoginControllerSchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
export type TLoginControllerInput = z.TypeOf<typeof LoginControllerSchema>;

export const LogoutControllerSchema = z.object({});
export type TLogoutControllerInput = z.TypeOf<typeof LogoutControllerSchema>;

export const updateRoleControllerSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userRole: z.enum(["user", "admin"]),
});
export type TUpdateRolecontrollerInput = z.TypeOf<
  typeof updateRoleControllerSchema
>;

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
export type TChangePasswordInput = z.TypeOf<typeof ChangePasswordSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),
});
export type TForgotPasswordInput = z.TypeOf<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(10, "Valid reset token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
export type TResetPasswordInput = z.TypeOf<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(10, "Valid verification token is required"),
});
export type TVerifyEmailInput = z.TypeOf<typeof VerifyEmailSchema>;

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_ -]+$/, "Username can only contain alphanumeric characters, dashes, and underscores")
    .trim()
    .optional(),
  phone: z.string().max(20, "Phone number too long").optional(),
  address: z.string().max(200, "Address too long").optional(),
  avatar: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
});
export type TUpdateProfileInput = z.TypeOf<typeof UpdateProfileSchema>;

export const RequestEmailChangeSchema = z.object({
  newEmail: z.string().email("Invalid email format").trim().toLowerCase(),
});
export type TRequestEmailChangeInput = z.TypeOf<typeof RequestEmailChangeSchema>;

export const VerifyEmailChangeSchema = z.object({
  token: z.string().min(10, "Valid verification token is required"),
});
export type TVerifyEmailChangeInput = z.TypeOf<typeof VerifyEmailChangeSchema>;

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Password confirmation is required to delete account"),
});
export type TDeleteAccountInput = z.TypeOf<typeof DeleteAccountSchema>;


