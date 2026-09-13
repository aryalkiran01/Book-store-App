import { env } from "../../config";
import { getAuthHeaders } from "../auth/fetch";

export type TReview = {
  _id: string;
  bookId: string | any;
  userId: string | any;
  rating: number;
  reviewText: string;
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

    return data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
}

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
    `${env.BACKEND_URL}/api/reviews/getReview/${input.bookId}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch reviews");
  }

  return data;
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
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rating: input.rating,
        reviewText: input.reviewText,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update review");
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
    `${env.BACKEND_URL}/api/reviews/addReview/${input.bookId}`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rating: Number(input.rating),
        reviewText: input.reviewText,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Something went wrong");
  }

  return data;
}

export type TDeleteReviewInput = {
  reviewId?: string;
  ReviewId?: string;
};

export type TDeleteReviewOutput = {
  message: string;
  isSuccess: boolean;
};

export async function deleteReviewBook(
  input: TDeleteReviewInput
): Promise<TDeleteReviewOutput> {
  const targetId = input.reviewId || input.ReviewId;
  const res = await fetch(
    `${env.BACKEND_URL}/api/reviews/deleteReview/${targetId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to delete review");
  }

  return data;
}

export type TGetAllReviewOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview[];
};

export async function getAllReviews(): Promise<TGetAllReviewOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/reviews`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch all reviews");
  }

  return data;
}

