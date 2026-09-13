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

  const newReview = new ReviewModel({
    bookId: ctx.bookId,
    userId: ctx.userId,
    username: sanitizeString(username) || "Anonymous",
    rating,
    reviewText: cleanReviewText,
  });

  await newReview.save();

  return newReview;
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

  return updatedReview;
}

export async function getAllReviewsService() {
  const reviews = await ReviewModel.find()
    .populate("bookId", "title author image")
    .sort({ created_at: -1 });
  return reviews;
}

export async function getReviewsByBookIdService(bookId: string) {
  validateObjectId(bookId, "Book ID");
  const reviews = await ReviewModel.find({
    bookId,
  })
    .populate("userId", "username email")
    .sort({ created_at: -1 });

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

  await ReviewModel.findByIdAndDelete(reviewId);

  return deleteReview;
}


