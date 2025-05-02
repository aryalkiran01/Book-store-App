import { env } from "../../config";

export type TReview = {
  length: number;
  rating: number;
  reviewText: string;
  _id: string;

  username: string;
  created_at: string;
};

export type TReviewUserOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview;
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

export type TGetReviewByIdInput = {
  bookId: string;
};

export type TGetReviewByIdOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview[];
};

export async function getReviewById(
  input: TGetReviewByIdInput
): Promise<TGetReviewByIdOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/Reviews/getReview/${input.bookId}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch reviews");
  }

  return res.json(); // Assuming the backend returns the reviews for the specific book
}
export type TUpdateReviewBookInput = {
  reviewId: string;
  rating: number;
  reviewText: string;
};

export type TUpdateReviewBookOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview;
};

export async function updateReviewBook(
  input: TUpdateReviewBookInput
): Promise<TUpdateReviewBookOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/reviews/updateReview/${input.reviewId}`,
    {
      method: "PUT",
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

  return data;
}

/**
 * for add Review api
 */
export type TAddReviewInput = {
  bookId?: string;
  rating: number | string;
  reviewText: string;
};
export type TAddReviewOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview;
};
export async function addReview(
  input: TAddReviewInput
): Promise<TAddReviewOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/Reviews/addReview/${input.bookId}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating: input.rating,
        reviewText: input.reviewText,
      }),
    }
  );

  const data = await res
    .json()
    .catch((err) => console.error("Error parsing JSON:", err));

  if (!res.ok) {
    console.error("Failed to fetch:", data);
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}

// New function to delete review

export async function deleteReviewBook(
  input: TDeleteReviewInput
): Promise<TDeleteReviewOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/Reviews/deleteReview/${input.ReviewId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message);
  }

  return data;
}

export type TGetAllReviewOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview[];
};
export async function getAllReviews(): Promise<TGetAllReviewOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/Reviews`, {
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

  return data;
}
export type TDeleteReviewInput = {
  ReviewId: string;
};

export type TDeleteReviewOutput = {
  message: string;
  isSuccess: boolean;
};
