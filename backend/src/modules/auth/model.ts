import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user", index: true },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    displayName: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true, maxlength: 500 },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "", trim: true },
    location: {
      city: { type: String, default: "", trim: true },
      district: { type: String, default: "", trim: true },
      province: { type: String, default: "", trim: true },
      country: { type: String, default: "Nepal", trim: true },
    },
    address: { type: String, default: "", trim: true },
    sessionVersion: { type: Number, default: 1, required: true },
    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: false, index: true },
    emailVerificationTokenHash: { type: String, default: "" },
    emailVerificationExpiresAt: { type: Date },
    pendingEmail: { type: String, default: "", lowercase: true, trim: true },
    pendingEmailVerificationTokenHash: { type: String, default: "" },
    pendingEmailExpiresAt: { type: Date },
    passwordResetTokenHash: { type: String, default: "" },
    passwordResetExpiresAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.passwordResetTokenHash;
        delete ret.emailVerificationTokenHash;
        delete ret.pendingEmailVerificationTokenHash;
        delete ret.sessionVersion;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model("User", userSchema);

