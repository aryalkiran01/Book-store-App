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
    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
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
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordResetTokenHash;
        delete ret.emailVerificationTokenHash;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model("User", userSchema);
