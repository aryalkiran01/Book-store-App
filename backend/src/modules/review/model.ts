import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: { type: String, required: true, default: "Anonymous" },
    userAvatar: { type: String, default: "" },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v >= 1 && v <= 5,
        message: "Rating must be an integer between 1 and 5",
      },
    },
    reviewText: { type: String, required: true, trim: true, maxlength: 2000 },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    isVerifiedPurchase: { type: Boolean, default: false, index: true },
    helpfulCount: { type: Number, default: 0, min: 0 },
    helpfulUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isReported: { type: Boolean, default: false, index: true },
    reportReason: { type: String, default: "" },
    reportedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["published", "flagged", "hidden"],
      default: "published",
      index: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for rapid lookups and uniqueness
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ bookId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ bookId: 1, status: 1, rating: -1 });
reviewSchema.index({ bookId: 1, status: 1, helpfulCount: -1 });

export const ReviewModel = mongoose.model("Review", reviewSchema);
