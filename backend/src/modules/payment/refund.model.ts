import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["requested", "approved", "processing", "completed", "rejected"],
      default: "requested",
      index: true,
    },
    provider: {
      type: String,
      default: "manual",
    },
    providerRefundId: {
      type: String,
      default: "",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

refundSchema.index({ orderId: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });

export const RefundModel = mongoose.model("Refund", refundSchema);
