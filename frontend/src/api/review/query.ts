import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  addReview,
  getReviews,
  TUpdateReviewBookInput,
  TAddReviewOutput,
  TAddReviewInput,
  TUpdateReviewBookOutput,
  TGetReviewsOutput,
  updateReviewBook,
  deleteReviewBook,
  TDeleteReviewOutput,
  TDeleteReviewInput,
  getAllReviews,
  TGetReviewsParams,
  toggleHelpfulReview,
  reportReview,
} from "./fetch";

/**
 * Add Review Mutation
 */
export function useAddReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation<TAddReviewOutput, Error, TAddReviewInput>({
    mutationFn: addReview,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
      queryClient.invalidateQueries({ queryKey: ["books", variables.bookId] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/**
 * Update Review Mutation
 */
export function useUpdateReviewBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TUpdateReviewBookOutput, Error, TUpdateReviewBookInput>({
    mutationFn: updateReviewBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/**
 * Delete Review Mutation
 */
export function useDeleteReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation<TDeleteReviewOutput, Error, TDeleteReviewInput>({
    mutationFn: deleteReviewBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/**
 * Toggle Helpful Vote Mutation
 */
export function useToggleHelpfulMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => toggleHelpfulReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
    },
  });
}

/**
 * Report Review Mutation
 */
export function useReportReviewMutation() {
  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) =>
      reportReview(reviewId, reason),
  });
}

/**
 * Get Reviews by Book ID Query
 */
export function useGetReviewByIdQuery(
  bookId: string,
  params?: TGetReviewsParams
) {
  return useQuery<TGetReviewsOutput, Error>({
    queryKey: [
      "Reviews",
      bookId,
      params?.page || 1,
      params?.sortBy || "newest",
      params?.ratingFilter,
      params?.verifiedOnly,
    ],
    queryFn: () => getReviews(bookId, params),
    enabled: Boolean(bookId),
  });
}

/**
 * Get All Reviews Query (Admin / Moderation)
 */
export function useGetReviewQuery(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ["all-reviews", params?.page, params?.status],
    queryFn: () => getAllReviews(params),
  });
}
