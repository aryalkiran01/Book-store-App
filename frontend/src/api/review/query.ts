import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  addReview,
  getReviewById,
  TUpdateReviewBookInput,
  TAddReviewOutput,
  TAddReviewInput,
  TGetAllReviewOutput,
  TUpdateReviewBookOutput,
  TGetReviewByIdOutput,
  updateReviewBook,
  deleteReviewBook,
  TDeleteReviewOutput,
  TDeleteReviewInput,
  getAllReviews,
} from "./fetch";

/**
 * for add Review api
 */
export function useAddReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation<TAddReviewOutput, Error, TAddReviewInput>({
    mutationFn: addReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
    },
  });
}

// Update Review Mutation
export function useUpdateReviewBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TUpdateReviewBookOutput, Error, TUpdateReviewBookInput>({
    mutationFn: updateReviewBook,
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
    },
    onError: (error) => {
      console.error("Error updating review", error);
    },
  });
}

// Delete Review Mutation
export function useDeleteReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation<TDeleteReviewOutput, Error, TDeleteReviewInput>({
    mutationFn: deleteReviewBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["Reviews"] });
    },
  });
}

export function useGetReviewByIdQuery(bookId: string) {
  return useQuery<TGetReviewByIdOutput, Error>({
    queryKey: ["Reviews", bookId], // Key is now linked to the specific bookId and reviewId
    queryFn: () => getReviewById({ bookId }), // Pass the bookId and reviewId to the fetch function
  });
}

/**
 * for get all books api
 */
export function useGetReviewQuery() {
  return useQuery<TGetAllReviewOutput, Error>({
    queryKey: ["books"],
    queryFn: getAllReviews,
  });
}
