import { env } from "../../config";
import { getAuthHeaders } from "../auth/fetch";

export type TBook = {
  _id: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  created_at: string;
  rating?: number;
  image: string;
  price: number;
  reviews?: any[];
};

/**
 * for add book api
 */
export type TAddBookInput = {
  title: string;
  author: string;
  genre: string;
  description: string;
  price: number;
  image?: string;
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

/**
 * for update book api
 */
export type TUpdateBookInput = {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  description: string;
  image: string;
  price: number;
};

export type TUpdateBookOutput = {
  message: string;
  isSuccess: boolean;
  data: TBook;
};

export async function updateBook(
  input: TUpdateBookInput
): Promise<TUpdateBookOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/books/${input.bookId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update book");
  }

  return data;
}

/**
 * for delete book api
 */
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

/**
 * for get all books api
 */
export type TGetAllBooksOutput = {
  message: string;
  isSuccess: boolean;
  data: TBook[];
};

export async function getAllBooks(params?: {
  search?: string;
  genre?: string;
  author?: string;
}): Promise<TGetAllBooksOutput> {
  const url = new URL(`${env.BACKEND_URL}/api/books`);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.genre && params.genre !== "All")
    url.searchParams.set("genre", params.genre);
  if (params?.author) url.searchParams.set("author", params.author);

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

/**
 * for get book by id api
 */
export type TGetBookByIdInput = {
  bookId: string;
};

export type TGetBookByIdOutput = {
  message: string;
  isSuccess: boolean;
  data: {
    result: TBook;
    review: any[];
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

