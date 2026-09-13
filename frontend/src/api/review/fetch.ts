import { env } from "../../config";
import { getAuthHeaders } from "../auth/fetch";

export type TReview = {
  _id: string;
  bookId: string | any;
  userId:
    | string
    | {
        _id: string;
        username: string;
        email?: string;
        avatar?: string;
      };
  rating: number;
  title?: string;
  reviewText: string;
  username: string;
  userAvatar?: string;
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  helpfulUsers?: string[];
  isReported?: boolean;
  status?: "published" | "flagged" | "hidden";
  createdAt: string;
  updatedAt?: string;
  created_at?: string;
};

export type RatingDistribution = {
  5: { count: number; percentage: number };
  4: { count: number; percentage: number };
  3: { count: number; percentage: number };
  2: { count: number; percentage: number };
  1: { count: number; percentage: number };
};

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  verifiedReviewsCount: number;
  ratingDistribution: RatingDistribution;
};

export type ReviewPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type TGetReviewsParams = {
  page?: number;
  limit?: number;
  sortBy?: "newest" | "oldest" | "rating-high" | "rating-low" | "most-helpful";
  ratingFilter?: number;
  verifiedOnly?: boolean;
};

export type TGetReviewsOutput = {
  message: string;
  isSuccess: boolean;
  data: TReview[];
  stats?: ReviewStats;
  pagination?: ReviewPagination;
};

export async function getReviews(
  bookId: string,
  params?: TGetReviewsParams
): Promise<TGetReviewsOutput> {
  const url = new URL(`${env.BACKEND_URL}/api/reviews/${bookId}`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params?.ratingFilter)
    url.searchParams.set("ratingFilter", String(params.ratingFilter));
  if (params?.verifiedOnly) url.searchParams.set("verifiedOnly", "true");

  const response = await fetch(url.toString(), {
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
}

export type TAddReviewInput = {
  bookId: string;
  rating: number;
  reviewText: string;
  title?: string;
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
        reviewText: input.reviewText.trim(),
        title: input.title ? input.title.trim() : undefined,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to submit review");
  }

  return data;
}

export type TUpdateReviewBookInput = {
  reviewId: string;
  rating?: number;
  reviewText?: string;
  title?: string;
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
        rating: input.rating !== undefined ? Number(input.rating) : undefined,
        reviewText: input.reviewText ? input.reviewText.trim() : undefined,
        title: input.title !== undefined ? input.title.trim() : undefined,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update review");
  }

  return data;
}

export type TDeleteReviewInput = {
  reviewId: string;
};

export type TDeleteReviewOutput = {
  message: string;
  isSuccess: boolean;
};

export async function deleteReviewBook(
  input: TDeleteReviewInput
): Promise<TDeleteReviewOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/reviews/deleteReview/${input.reviewId}`,
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

export async function toggleHelpfulReview(reviewId: string): Promise<{
  message: string;
  isSuccess: boolean;
  data: { reviewId: string; helpfulCount: number; hasVotedHelpful: boolean };
}> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/reviews/${reviewId}/helpful`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to toggle helpful vote");
  }

  return data;
}

export async function reportReview(
  reviewId: string,
  reason: string
): Promise<{ message: string; isSuccess: boolean }> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/reviews/${reviewId}/report`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason: reason.trim() }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to report review");
  }

  return data;
}

export async function getAllReviews(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  message: string;
  isSuccess: boolean;
  data: TReview[];
  pagination: ReviewPagination;
}> {
  const url = new URL(`${env.BACKEND_URL}/api/reviews`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.status) url.searchParams.set("status", params.status);

  const res = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch all reviews");
  }

  return data;
}
