import { useGetReviewByIdQuery } from "../../api/review/query"; 
import { Updatereview } from "../review/update-review"; 
import { useDeleteReview } from "../review/delete-review";

export const Reviews = ({ bookId }: { bookId: string}) => {
  const { data: reviewsData, isLoading, isError, error, refetch } = useGetReviewByIdQuery(bookId); // Fetch reviews
  const handleDelete = useDeleteReview();

  return (
    <div className="reviews-section mt-6">
      <h2 className="text-2xl font-semibold text-gray-700">Reviews</h2>

      {isLoading && <p className="text-gray-500">Loading reviews...</p>} {/* Loading State */}
      {isError && <p className="text-red-500">{error?.message || "Failed to load reviews."}</p>} {/* Error State */}

      {Array.isArray(reviewsData?.data) && reviewsData.data.length > 0 ? (
        <div className="review-list mt-4 space-y-4">
          {Array.isArray(reviewsData.data) && reviewsData.data.map((review) => (
            <div
              key={review._id}
              className="review-item p-6 bg-white rounded-md shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="rating flex items-center">
                  <span className="font-semibold">Rating:</span>
                  <span className="ml-2 text-yellow-500">
                    {"★".repeat(review.rating)}{" "}
                    {"☆".repeat(5 - review.rating)}
                  </span>
                </div>
                <div className="date text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
              <p className="review-text mt-2 text-gray-800">
                Review Text: {review.reviewText}
              </p>
              <p className="text-sm text-gray-500 mt-1">By: {review.userId}</p>
              <div className="flex gap-2 mt-2">
                {/* Update Review Button */}
                <Updatereview review={review} onUpdateSuccess={refetch} />
                {/* Delete Review Button */}
                <button
                  onClick={() => handleDelete(review._id, refetch)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // No Reviews Message
        <p className="text-gray-500 mt-4">No reviews yet. Be the first to review this book!</p>
      )}
    </div>
  );
};

