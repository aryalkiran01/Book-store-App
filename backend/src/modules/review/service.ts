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

/**
 * Aggregates all reviews for a book and updates the book's averageRating and totalReviews.
 */
export async function updateBookRatingAggregation(bookId: string) {
  try {
    const stats = await ReviewModel.aggregate([
      { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
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

export async function createReviewService(
  ctx: TReviewCtx,
  input: TAddReviewControllerInput & { username: string }
) {
  validateObjectId(ctx.bookId, "Book ID");
  validateObjectId(ctx.userId, "User ID");

  const book = await BookModel.findById(ctx.bookId);
  if (!book) {
    throw APIError.notFound("Book not found");
  }

  const { rating, reviewText, username } = input;
  const cleanReviewText = sanitizeString(reviewText);

  if (!cleanReviewText) {
    throw APIError.badRequest("Review text cannot be empty");
  }

  const cleanUsername = sanitizeString(username) || "Anonymous";

  // Check if user already reviewed this book (upsert pattern)
  let review = await ReviewModel.findOne({
    bookId: ctx.bookId,
    userId: ctx.userId,
  });

  if (review) {
    review.rating = rating;
    review.reviewText = cleanReviewText;
    review.username = cleanUsername;
    await review.save();
  } else {
    review = new ReviewModel({
      bookId: ctx.bookId,
      userId: ctx.userId,
      username: cleanUsername,
      rating,
      reviewText: cleanReviewText,
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

  // Check if the user is the owner or admin
  const isOwner = review.userId?.toString() === ctx.userId;
  const isAdmin = ctx.role === "admin";

  if (!isOwner && !isAdmin) {
    throw APIError.forbidden("You are not authorized to update this review");
  }

  const { reviewText, rating } = input;
  const cleanReviewText = sanitizeString(reviewText);

  if (!cleanReviewText) {
    throw APIError.badRequest("Review text is required");
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw APIError.badRequest("Rating must be a number between 1 and 5");
  }

  const updatedReview = await ReviewModel.findByIdAndUpdate(
    reviewId,
    {
      reviewText: cleanReviewText,
      rating,
    },
    { new: true }
  );

  if (!updatedReview) {
    throw APIError.notFound("Review not found during update");
  }

  // Recalculate book average rating & total reviews
  await updateBookRatingAggregation(review.bookId.toString());

  return updatedReview;
}

export async function getAllReviewsService() {
  const reviews = await ReviewModel.find()
    .populate("bookId", "title author image price averageRating")
    .sort({ createdAt: -1 })
    .lean();
  return reviews;
}

export async function getReviewsByBookIdService(bookId: string) {
  validateObjectId(bookId, "Book ID");
  const reviews = await ReviewModel.find({ bookId })
    .populate("userId", "username email avatar")
    .sort({ createdAt: -1 })
    .lean();

  return reviews;
}

export async function deleteReviewService(reviewId: string, ctx: TReviewCtx) {
  validateObjectId(reviewId, "Review ID");
  validateObjectId(ctx.userId, "User ID");

  const deleteReview = await ReviewModel.findById(reviewId);

  if (!deleteReview) {
    throw APIError.notFound("Review not found");
  }

  // Check if the user is the owner or an admin
  if (deleteReview.userId?.toString() !== ctx.userId && ctx.role !== "admin") {
    throw APIError.forbidden("You are not authorized to delete this review");
  }

  const targetBookId = deleteReview.bookId.toString();
  await ReviewModel.findByIdAndDelete(reviewId);

  // Recalculate book average rating & total reviews
  await updateBookRatingAggregation(targetBookId);

  return deleteReview;
}


