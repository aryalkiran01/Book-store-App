import mongoose from "mongoose";
import {
  TAddReviewControllerInput,
  TReviewCtx,
  TUpdateReviewControllerInput,
} from "./validation";
import { ReviewModel } from "./model";
import { APIError } from "../../utils/error";
import { sanitizeString, validateObjectId } from "../../utils/security";
import { BookModel } from "../book/model";
import { OrderModel } from "../order/model";

export type RatingDistribution = {
  5: { count: number; percentage: number };
  4: { count: number; percentage: number };
  3: { count: number; percentage: number };
  2: { count: number; percentage: number };
  1: { count: number; percentage: number };
};

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  verifiedReviewsCount: number;
  ratingDistribution: RatingDistribution;
};

/**
 * Aggregates all published reviews for a book and updates the book's averageRating and totalReviews.
 */
export async function updateBookRatingAggregation(bookId: string) {
  try {
    const stats = await ReviewModel.aggregate([
      {
        $match: {
          bookId: new mongoose.Types.ObjectId(bookId),
          status: { $ne: "hidden" },
        },
      },
      {
        $group: {
          _id: "$bookId",
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    if (stats.length > 0) {
      await BookModel.findByIdAndUpdate(bookId, {
        totalReviews: stats[0].totalReviews,
        averageRating: Number(stats[0].avgRating.toFixed(1)),
      });
    } else {
      await BookModel.findByIdAndUpdate(bookId, {
        totalReviews: 0,
        averageRating: 0,
      });
    }
  } catch (err) {
    console.error(`Failed to aggregate ratings for book ${bookId}:`, err);
  }
}

/**
 * Computes rating distribution breakdown and summary stats for a book.
 */
export async function getReviewStats(bookId: string): Promise<ReviewStats> {
  const matchFilter = {
    bookId: new mongoose.Types.ObjectId(bookId),
    status: { $ne: "hidden" },
  };

  const [aggregateResult, verifiedCount] = await Promise.all([
    ReviewModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]),
    ReviewModel.countDocuments({
      ...matchFilter,
      isVerifiedPurchase: true,
    }),
  ]);

  const distributionCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalReviews = 0;
  let weightedSum = 0;

  for (const item of aggregateResult) {
    const r = Number(item._id);
    if (r >= 1 && r <= 5) {
      distributionCounts[r] = item.count;
      totalReviews += item.count;
      weightedSum += r * item.count;
    }
  }

  const averageRating =
    totalReviews > 0 ? Number((weightedSum / totalReviews).toFixed(1)) : 0;

  const ratingDistribution: RatingDistribution = {
    5: {
      count: distributionCounts[5],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[5] / totalReviews) * 100) : 0,
    },
    4: {
      count: distributionCounts[4],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[4] / totalReviews) * 100) : 0,
    },
    3: {
      count: distributionCounts[3],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[3] / totalReviews) * 100) : 0,
    },
    2: {
      count: distributionCounts[2],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[2] / totalReviews) * 100) : 0,
    },
    1: {
      count: distributionCounts[1],
      percentage: totalReviews > 0 ? Math.round((distributionCounts[1] / totalReviews) * 100) : 0,
    },
  };

  return {
    averageRating,
    totalReviews,
    verifiedReviewsCount: verifiedCount,
    ratingDistribution,
  };
}

export async function createReviewService(
  ctx: TReviewCtx,
  input: TAddReviewControllerInput & { username: string; userAvatar?: string }
) {
  validateObjectId(ctx.bookId, "Book ID");
  validateObjectId(ctx.userId, "User ID");

  const book = await BookModel.findById(ctx.bookId);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  const { rating, reviewText, title, username, userAvatar } = input;
  const cleanReviewText = sanitizeString(reviewText);

  if (!cleanReviewText || cleanReviewText.length < 3) {
    throw APIError.badRequest("Review text must be at least 3 characters");
  }

  const cleanUsername = sanitizeString(username) || "Anonymous";
  const cleanTitle = title ? sanitizeString(title) : "";

  // Check if this user bought this book (Verified Purchase)
  const isVerifiedPurchase = Boolean(
    await OrderModel.exists({
      userId: new mongoose.Types.ObjectId(ctx.userId),
      status: { $ne: "cancelled" },
      "books.bookId": new mongoose.Types.ObjectId(ctx.bookId),
    })
  );

  // Check if user already reviewed this book (upsert pattern)
  let review = await ReviewModel.findOne({
    bookId: ctx.bookId,
    userId: ctx.userId,
  });

  if (review) {
    review.rating = rating;
    review.reviewText = cleanReviewText;
    review.title = cleanTitle;
    review.username = cleanUsername;
    if (userAvatar) review.userAvatar = userAvatar;
    review.isVerifiedPurchase = isVerifiedPurchase;
    review.status = "published";
    await review.save();
  } else {
    review = new ReviewModel({
      bookId: ctx.bookId,
      userId: ctx.userId,
      username: cleanUsername,
      userAvatar: userAvatar || "",
      rating,
      title: cleanTitle,
      reviewText: cleanReviewText,
      isVerifiedPurchase,
      status: "published",
    });
    await review.save();
  }

  // Recalculate book average rating & total reviews
  await updateBookRatingAggregation(ctx.bookId);

  return review;
}

export async function updateReviewService(
  reviewId: string,
  ctx: TReviewCtx,
  input: TUpdateReviewControllerInput
) {
  validateObjectId(reviewId, "Review ID");
  validateObjectId(ctx.userId, "User ID");

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    throw APIError.notFound("Review not found");
  }

  // Authorization check
  const isOwner = review.userId?.toString() === ctx.userId;
  const isAdmin = ctx.role === "admin";

  if (!isOwner && !isAdmin) {
    throw APIError.forbidden("You are not authorized to edit this review");
  }

  if (input.reviewText !== undefined) {
    const cleanReviewText = sanitizeString(input.reviewText);
    if (!cleanReviewText || cleanReviewText.length < 3) {
      throw APIError.badRequest("Review text must be at least 3 characters");
    }
    review.reviewText = cleanReviewText;
  }

  if (input.rating !== undefined) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw APIError.badRequest("Rating must be an integer between 1 and 5");
    }
    review.rating = input.rating;
  }

  if (input.title !== undefined) {
    review.title = sanitizeString(input.title);
  }

  await review.save();

  // Recalculate book average rating & total reviews
  await updateBookRatingAggregation(review.bookId.toString());

  return review;
}

export interface ReviewFilterOptions {
  page?: number;
  limit?: number;
  sortBy?: "newest" | "oldest" | "rating-high" | "rating-low" | "most-helpful";
  ratingFilter?: number;
  verifiedOnly?: boolean;
}

export async function getReviewsByBookIdService(
  bookId: string,
  options?: ReviewFilterOptions
) {
  validateObjectId(bookId, "Book ID");

  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options?.limit) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {
    bookId: new mongoose.Types.ObjectId(bookId),
    status: { $ne: "hidden" },
  };

  if (options?.ratingFilter && options.ratingFilter >= 1 && options.ratingFilter <= 5) {
    filter.rating = options.ratingFilter;
  }

  if (options?.verifiedOnly) {
    filter.isVerifiedPurchase = true;
  }

  let sortOption: Record<string, any> = { createdAt: -1 };
  if (options?.sortBy === "oldest") {
    sortOption = { createdAt: 1 };
  } else if (options?.sortBy === "rating-high") {
    sortOption = { rating: -1, createdAt: -1 };
  } else if (options?.sortBy === "rating-low") {
    sortOption = { rating: 1, createdAt: -1 };
  } else if (options?.sortBy === "most-helpful") {
    sortOption = { helpfulCount: -1, rating: -1, createdAt: -1 };
  }

  const [reviews, total, stats] = await Promise.all([
    ReviewModel.find(filter)
      .populate("userId", "username email avatar")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments(filter),
    getReviewStats(bookId),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    reviews,
    stats,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function deleteReviewService(reviewId: string, ctx: TReviewCtx) {
  validateObjectId(reviewId, "Review ID");
  validateObjectId(ctx.userId, "User ID");

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    throw APIError.notFound("Review not found");
  }

  // Authorization check
  if (review.userId?.toString() !== ctx.userId && ctx.role !== "admin") {
    throw APIError.forbidden("You are not authorized to delete this review");
  }

  const targetBookId = review.bookId.toString();
  await ReviewModel.findByIdAndDelete(reviewId);

  // Recalculate book average rating & total reviews
  await updateBookRatingAggregation(targetBookId);

  return review;
}

export async function toggleHelpfulService(reviewId: string, userId: string) {
  validateObjectId(reviewId, "Review ID");
  validateObjectId(userId, "User ID");

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    throw APIError.notFound("Review not found");
  }

  if (review.userId.toString() === userId) {
    throw APIError.badRequest("You cannot vote your own review as helpful");
  }

  const userObjId = new mongoose.Types.ObjectId(userId);
  const alreadyVotedIndex = review.helpfulUsers.findIndex((u) => u.toString() === userId);

  let voted = false;
  if (alreadyVotedIndex > -1) {
    // Remove helpful vote
    review.helpfulUsers.splice(alreadyVotedIndex, 1);
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    voted = false;
  } else {
    // Add helpful vote
    review.helpfulUsers.push(userObjId);
    review.helpfulCount = review.helpfulCount + 1;
    voted = true;
  }

  await review.save();

  return {
    reviewId: review._id,
    helpfulCount: review.helpfulCount,
    hasVotedHelpful: voted,
  };
}

import { ReviewReportModel } from "./report.model";

export async function reportReviewService(
  reviewId: string,
  userId: string,
  reason: string
) {
  validateObjectId(reviewId, "Review ID");
  validateObjectId(userId, "User ID");

  const cleanReason = sanitizeString(reason);
  if (!cleanReason || cleanReason.length < 3) {
    throw APIError.badRequest("Please provide a valid report reason");
  }

  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    throw APIError.notFound("Review not found");
  }

  const userObjId = new mongoose.Types.ObjectId(userId);
  const alreadyReported = review.reportedBy?.some((u) => u.toString() === userId);

  if (!alreadyReported) {
    if (!review.reportedBy) review.reportedBy = [];
    review.reportedBy.push(userObjId);
  }

  review.isReported = true;
  review.reportReason = cleanReason;
  review.status = "flagged";
  await review.save();

  // Create or update review report model entry
  await ReviewReportModel.findOneAndUpdate(
    { reviewId, reportedBy: userId },
    {
      reviewId,
      reportedBy: userId,
      reason: cleanReason,
      status: "pending",
    },
    { upsert: true, new: true }
  );

  return {
    message: "Review reported successfully for moderation review",
    reviewId: review._id,
  };
}

export async function getAllReviewsService(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (params?.status) {
    filter.status = params.status;
  }

  const [reviews, total] = await Promise.all([
    ReviewModel.find(filter)
      .populate("bookId", "title author image price averageRating")
      .populate("userId", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments(filter),
  ]);

  return {
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function adminModerateReviewService(
  reviewId: string,
  status: "published" | "flagged" | "hidden"
) {
  validateObjectId(reviewId, "Review ID");
  const review = await ReviewModel.findById(reviewId);
  if (!review) {
    throw APIError.notFound("Review not found");
  }

  review.status = status;
  if (status === "published") {
    review.isReported = false;
  }
  await review.save();

  await updateBookRatingAggregation(review.bookId.toString());

  return review;
}

export async function getReviewReportsService(query?: { status?: string; page?: number; limit?: number }) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query?.status) {
    filter.status = query.status;
  }

  const [total, reports] = await Promise.all([
    ReviewReportModel.countDocuments(filter),
    ReviewReportModel.find(filter)
      .populate({
        path: "reviewId",
        populate: [
          { path: "bookId", select: "title author image" },
          { path: "userId", select: "username email" },
        ],
      })
      .populate("reportedBy", "username email")
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    reports,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function resolveReviewReportService(
  reportId: string,
  adminUserId: string,
  status: "reviewed" | "dismissed" | "actioned",
  resolutionNote?: string
) {
  validateObjectId(reportId, "Report ID");
  validateObjectId(adminUserId, "Admin User ID");

  const report = await ReviewReportModel.findById(reportId);
  if (!report) throw APIError.notFound("Review report not found");

  report.status = status;
  report.reviewedBy = adminUserId as any;
  if (resolutionNote) report.resolutionNote = resolutionNote;
  await report.save();

  return report;
}
