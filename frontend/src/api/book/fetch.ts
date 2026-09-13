import { env } from "../../config";
import { getAuthHeaders } from "../auth/fetch";

export type TBook = {
  _id: string;
  id?: string;
  title: string;
  author: string;
  genre: string;
  description?: string;
  image?: string;
  price: number;
  discountPercentage?: number;
  stock?: number;
  isbn?: string;
  publisher?: string;
  publicationDate?: string;
  pages?: number;
  language?: string;
  averageRating?: number;
  totalReviews?: number;
  featured?: boolean;
  isNewArrival?: boolean;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  rating?: number;
  reviews?: any[];
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type TAddBookInput = {
  title: string;
  author: string;
  genre: string;
  description?: string;
  price: number;
  image?: string;
  discountPercentage?: number;
  stock?: number;
  isbn?: string;
  publisher?: string;
  publicationDate?: string;
  pages?: number;
  language?: string;
  featured?: boolean;
  isNewArrival?: boolean;
};

export type TAddBookOutput = {
  message: string;
  isSuccess: boolean;
  data: TBook;
};

export async function addBook(input: TAddBookInput): Promise<TAddBookOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/books`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to add book");
  }

  return data;
}

export type TUpdateBookInput = Partial<TAddBookInput> & {
  bookId: string;
};

export type TUpdateBookOutput = {
  message: string;
  isSuccess: boolean;
  data: TBook;
};

export async function updateBook(
  input: TUpdateBookInput
): Promise<TUpdateBookOutput> {
  const { bookId, ...payload } = input;
  const res = await fetch(`${env.BACKEND_URL}/api/books/${bookId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update book");
  }

  return data;
}

export type TDeleteBookInput = {
  bookId: string;
};

export type TDeleteBookOutput = {
  message: string;
  isSuccess: boolean;
};

export async function deleteBook(
  input: TDeleteBookInput
): Promise<TDeleteBookOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/books/${input.bookId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to delete book");
  }

  return data;
}

export type BookFilterParams = {
  search?: string;
  genre?: string;
  author?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "price-asc" | "price-desc" | "rating" | "popular";
  featured?: boolean;
  isNewArrival?: boolean;
  inStock?: boolean;
};

export type TGetAllBooksOutput = {
  message: string;
  isSuccess: boolean;
  data: TBook[];
  pagination?: PaginationMeta;
};

export async function getAllBooks(
  params?: BookFilterParams
): Promise<TGetAllBooksOutput> {
  const url = new URL(`${env.BACKEND_URL}/api/books`);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.genre && params.genre !== "All")
    url.searchParams.set("genre", params.genre);
  if (params?.author) url.searchParams.set("author", params.author);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.minPrice !== undefined)
    url.searchParams.set("minPrice", String(params.minPrice));
  if (params?.maxPrice !== undefined)
    url.searchParams.set("maxPrice", String(params.maxPrice));
  if (params?.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params?.featured !== undefined)
    url.searchParams.set("featured", String(params.featured));
  if (params?.isNewArrival !== undefined)
    url.searchParams.set("isNewArrival", String(params.isNewArrival));
  if (params?.inStock) url.searchParams.set("inStock", "true");

  const res = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load books");
  }

  return data;
}

export async function getGenres(): Promise<string[]> {
  const res = await fetch(`${env.BACKEND_URL}/api/books/genres`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return data.data || [];
}

export async function getFeaturedBooks(): Promise<TBook[]> {
  const res = await fetch(`${env.BACKEND_URL}/api/books/featured`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return data.data || [];
}

export async function getNewArrivalsBooks(): Promise<TBook[]> {
  const res = await fetch(`${env.BACKEND_URL}/api/books/new-arrivals`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  return data.data || [];
}

export type TGetBookByIdInput = {
  bookId: string;
};

export type TGetBookByIdOutput = {
  message: string;
  isSuccess: boolean;
  data: {
    result: TBook;
    review: any[];
    reviews?: any[];
    [key: string]: any;
  };
};

export async function getBookById(
  input: TGetBookByIdInput
): Promise<TGetBookByIdOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/books/${input.bookId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Book not found");
  }

  return data;
}

