import mongoose from "mongoose";

export type TInventoryTransactionType =
  | "SALE"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "RETURN"
  | "REFUND"
  | "MANUAL_ADJUSTMENT"
  | "RESTOCK"
  | "DAMAGE";

const inventoryTransactionSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "SALE",
        "RESERVATION",
        "RESERVATION_RELEASE",
        "RETURN",
        "REFUND",
        "MANUAL_ADJUSTMENT",
        "RESTOCK",
        "DAMAGE",
      ],
      required: true,
      index: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    previousReservedStock: {
      type: Number,
      default: 0,
    },
    newReservedStock: {
      type: Number,
      default: 0,
    },
    referenceId: {
      type: String,
      default: "",
      index: true,
    },
    reason: {
      type: String,
      default: "",
    },
    performedBy: {
      type: String,
      default: "system",
      index: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

inventoryTransactionSchema.index({ bookId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });

export const InventoryTransactionModel = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);
