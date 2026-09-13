import { z } from "zod";

export const AddReviewControllerSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Minimum rating is 1 star")
    .max(5, "Maximum rating is 5 stars"),
  reviewText: z
    .string()
    .min(3, "Review text must be at least 3 characters")
    .max(2000, "Review text cannot exceed 2000 characters")
    .trim(),
  title: z
    .string()
    .max(120, "Title cannot exceed 120 characters")
    .trim()
    .optional(),
});

export type TAddReviewControllerInput = z.TypeOf<
  typeof AddReviewControllerSchema
>;

export const UpdateReviewControllerSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Minimum rating is 1 star")
    .max(5, "Maximum rating is 5 stars")
    .optional(),
  reviewText: z
    .string()
    .min(3, "Review text must be at least 3 characters")
    .max(2000, "Review text cannot exceed 2000 characters")
    .trim()
    .optional(),
  title: z
    .string()
    .max(120, "Title cannot exceed 120 characters")
    .trim()
    .optional(),
});

export type TUpdateReviewControllerInput = z.TypeOf<
  typeof UpdateReviewControllerSchema
>;

export const ReportReviewSchema = z.object({
  reason: z
    .string()
    .min(3, "Please provide a reason with at least 3 characters")
    .max(500, "Reason cannot exceed 500 characters")
    .trim(),
});

export type TReportReviewInput = z.TypeOf<typeof ReportReviewSchema>;

export type TReviewCtx = {
  userId: string;
  bookId: string;
  role?: string;
  userAvatar?: string;
};
