import React, { useEffect, useState } from "react";
import { getReviews } from "../../api/review/fetch"; // Assuming fetch function is correctly imported

const Reviews = ({ bookId }: { bookId: string }) => {
  const [reviews, setReviews] = useState<any[]>([]); // State to hold reviews
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Fetch reviews when the component mounts
    const fetchReviews = async () => {
      try {
        const fetchedReviews = await getReviews(bookId); // Fetch reviews from API
        if (fetchedReviews.isSuccess) {
          setReviews(fetchedReviews.data); // Store reviews in state
        } else {
          setError(fetchedReviews.message || "Failed to load reviews");
        }
      } catch (error: any) {
        setError(`Failed to load reviews: ${error.message}`);
      }
    };

    fetchReviews();
  }, [bookId]); // Re-fetch reviews if bookId changes

  return (
    <div className="reviews-section mt-6">
      {error && <p className="text-red-500">{error}</p>} {/* Error message in red */}
      <h2 className="text-2xl font-semibold text-gray-700">Reviews</h2>
      
      {/* If no reviews, show this message */}
      {reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet. Be the first to review this book!</p>
      ) : (
        <div className="review-list mt-4 space-y-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="review-item p-4 bg-white rounded-md shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="rating flex items-center">
                  <span className="font-semibold">Rating:</span>
                  <span className="ml-2 text-yellow-500">{review.rating} ★</span>
                </div>
                <div className="date text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleString()}
                </div>
              </div>
              
              <p className="review-text mt-2 text-gray-800">{review.reviewText}</p>
              <p className="text-sm text-gray-500 mt-1">By: {review.userId}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
