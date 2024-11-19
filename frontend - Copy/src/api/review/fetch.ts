import { env } from "../../config";

export type TReview = {
  bookId: string;
  rating: number;
  reviewText: string;
  reviewId: string;
};

export type TReviewUserOutput = {
  message: string;
  isSuccess: boolean;
  data: {
    bookId: string;      // bookId is part of the response data
    userId: string;
    rating: number;
    reviewText: string;
    _id: string;         // MongoDB _id
    created_at: string;  // Review creation timestamp
    __v: number;         // Version key for MongoDB
  };
};

export async function getReviews(bookId: string) {
  try {
    const response = await fetch(`${env.BACKEND_URL}/api/reviews/${bookId}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch reviews");
    }

    return data; // Assuming data is an object with reviews
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
}

export type TReviewUserInput = {
  bookId: string;
  rating: number;
  reviewText: string;
};

export async function addReview(
  input: TReviewUserInput
): Promise<TReviewUserOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/reviews/${input.bookId}`, { // Fixed URL
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message);
  }

  return data; // Return the full response, including the bookId
}

export type TGetReviewByIdInput = {
  bookId: string;
  reviewId: string;
};

export type TGetReviewByIdOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview;
};

export async function getReviewById(
  input: TGetReviewByIdInput
): Promise<TGetReviewByIdOutput> {
  const { bookId, reviewId } = input; // Destructure bookId and reviewId

  const res = await fetch(`${env.BACKEND_URL}/api/reviews/${bookId}/${reviewId}`, { // Use both bookId and reviewId in the URL
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;  // Return the data as expected
}


export type TUpdateReviewBookInput = {
  bookId: string;
  rating: number;
  reviewText: string;
};

export type TUpdateReviewBookOutput = {
  message: string;
  isSuccess: boolean;
  data: {
    reviewId: string;
    rating: number;
    reviewText: string;
    bookId: string; // Ensure bookId is part of the response
  };
};

export async function updateReviewBook(
  input: TUpdateReviewBookInput
): Promise<TUpdateReviewBookOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/reviews/update/${input.bookId}`, { // Fixed URL
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message);
  }

  return data; // Ensure the response includes bookId
}
