import { useState } from "react";
import { errorToast, successToast } from "../toaster";
import { GoCodeReview } from "react-icons/go";
import { useAddReviewMutation } from "../../api/review/query";
import { BsStar, BsStarFill } from "react-icons/bs";

export function HomeReviewBook({
  bookId,
}: {
  bookId: string;
}) {
  const addReviewMutation = useAddReviewMutation();
  const [isReviewing, setIsReviewing] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    reviewText: "",
  });
  const [hoveredRating, setHoveredRating] = useState<number | null>(null); // For showing hover state of stars

  const addReview = async () => {
    if (formData.rating < 1 || formData.rating > 5) {
      errorToast("Please provide a rating between 1 and 5");
      return;
    }

    if (formData.reviewText.trim().length === 0) {
      errorToast("Review text cannot be empty");
      return;
    }

    try {
      await addReviewMutation.mutateAsync(
        {
          bookId,
          ...formData,
        },
        {
          onSuccess(data) {
            successToast(data.message);
            setIsReviewing(false);
            setFormData({ rating: 0, reviewText: "" }); // Clear the form after success
          },
          onError(error) {
            console.error("error", error);
            errorToast(error.message || "Something went wrong");
          },
        }
      );
    } catch (error) {
      console.error("error", error);
      errorToast("Something went wrong");
    }
  };

  // Handle rating change using star clicks
  const handleRatingChange = (rating: number) => {
    setFormData({ ...formData, rating });
    setHoveredRating(null); // Clear the hovered rating on click
  };

  // Handle hover effect
  const handleStarHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleStarLeave = () => {
    setHoveredRating(null);
  };

  return (
    <>
      <div
        onClick={() => setIsReviewing(true)}
        className="flex items-center gap-2 text-white bg-indigo-600 px-4 py-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-transform duration-300 cursor-pointer transform hover:scale-105"
      >
        <GoCodeReview className="text-xl" />
        <span className="font-semibold">Add a Review</span>
      </div>

      {isReviewing && (
        <div
          className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-40"
          aria-labelledby="review-book-modal"
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg mx-4 p-6 transform transition-all ease-in-out duration-300 scale-100 hover:scale-105">
            <h2 id="review-book-modal" className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Share Your Thoughts
            </h2>
            <div className="mb-4">
              <label className="block text-lg font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1 justify-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div
                    key={star}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRatingChange(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={handleStarLeave}
                    aria-label={`Rate ${star} stars`}
                    className="text-yellow-500 hover:text-yellow-400 transition duration-200 cursor-pointer transform hover:scale-110"
                  >
                    {hoveredRating !== null ? (
                      hoveredRating >= star ? <BsStarFill size={28} /> : <BsStar size={28} />
                    ) : (
                      formData.rating >= star ? <BsStarFill size={28} /> : <BsStar size={28} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-lg font-medium text-gray-700 mb-2">Review</label>
              <textarea
                value={formData.reviewText}
                onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                className="w-full h-32 border-2 border-gray-300 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Write your review here..."
              />
            </div>
            <div className="flex justify-between gap-4">
              <button
                onClick={addReview}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition duration-200 transform hover:scale-105"
              >
                Submit Review
              </button>
              <button
                onClick={() => {
                  setIsReviewing(false);
                  setFormData({ rating: 0, reviewText: "" }); // Reset form on cancel
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-xl shadow-md hover:bg-gray-600 transition duration-200 transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
