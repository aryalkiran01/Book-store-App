import { useEffect, useState } from "react";
import { getReviews } from "../api/review/fetch";
const Reviews = ({ bookId }: { bookId: string }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reviews, setReviews] = useState<any[]>([]);  // State to store reviews
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const fetchedReviews = await getReviews(bookId);  // Call API to get reviews
        if (fetchedReviews.isSuccess) {
          setReviews(fetchedReviews.data);  // Set reviews in state
        } else {
          setError(fetchedReviews.message || "Failed to load reviews");
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setError(`Failed to load reviews: ${error.message}`);
      }
    };

    fetchReviews();  // Fetch reviews on component mount

  }, [bookId]);  // Re-fetch if bookId changes

  return (
    <div>
      {error && <p>{error}</p>}
      <h2>Reviews</h2>
      <div>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <div key={review._id}>
              <p>Rating: {review.rating}</p>
              <p>{review.reviewText}</p>
              <p>By: {review.userId}</p>
              <p>Created at: {new Date(review.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
