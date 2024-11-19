import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addReview,
  TReviewUserInput,
  TReviewUserOutput,
  TUpdateReviewBookInput,
  TUpdateReviewBookOutput,
  updateReviewBook,
} from "./fetch";

export function UseaddReviewBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TReviewUserOutput, Error, TReviewUserInput>({
    mutationFn: addReview,
    onSuccess: (data) => {
      console.log("Review added successfully", data);
      console.log("Book ID:", data.data.bookId);  // Access bookId in the response

      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) => {
      console.error("Error adding review", error);
    },
  });
}

export function useUpdateReviewBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TUpdateReviewBookOutput, Error, TUpdateReviewBookInput>({
    mutationFn: updateReviewBook,
    onSuccess: (data) => {
      console.log("Review updated successfully", data);
      console.log("Book ID:", data.data.bookId);  // Access bookId in the response

      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (error) => {
      console.error("Error updating review", error);
    },
  });
}
