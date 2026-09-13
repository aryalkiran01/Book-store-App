import { useDeleteReviewMutation } from "../../api/review/query";
import { errorToast, successToast } from "../toaster";

export const useDeleteReview = () => {
  const deleteReviewMutation = useDeleteReviewMutation();

  const handleDelete = async (reviewId: string, refetch?: () => void) => {
    try {
      await deleteReviewMutation.mutateAsync(
        { reviewId },
        {
          onSuccess() {
            successToast("Review deleted successfully");
            if (refetch) refetch();
          },
          onError(error: any) {
            errorToast(error?.message || "Error deleting review");
          },
        }
      );
    } catch (error) {
      errorToast("Error deleting review");
    }
  };

  return handleDelete;
};
