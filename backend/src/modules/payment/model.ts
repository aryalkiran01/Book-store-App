import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["khalti", "esewa", "cod", "demo", "card", "cash_on_delivery"],
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    paymentReference: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaisa: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "NPR",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "partially_refunded", "refunded"],
      default: "pending",
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// Prevent duplicate payment records for the same gateway transaction ID
paymentSchema.index({ provider: 1, transactionId: 1 }, { unique: true });
paymentSchema.index({ orderId: 1, status: 1 });

export const PaymentModel = mongoose.model("Payment", paymentSchema);
