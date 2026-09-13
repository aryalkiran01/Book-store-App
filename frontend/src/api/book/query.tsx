import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBook,
  deleteBook,
  getAllBooks,
  getBookById,
  TAddBookInput,
  TAddBookOutput,
  TDeleteBookInput,
  TDeleteBookOutput,
  TGetAllBooksOutput,
  TGetBookByIdOutput,
  TUpdateBookInput,
  TUpdateBookOutput,
  TSearchSuggestion,
  getSearchSuggestions,
  updateBook,
} from "./fetch";


/**
 * for add book api
 */
export function useAddBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TAddBookOutput, Error, TAddBookInput>({
    mutationFn: addBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/**
 * for update book api
 */
export function useUpdateBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TUpdateBookOutput, Error, TUpdateBookInput>({
    mutationFn: updateBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/**
 * for delete book api
 */
export function useDeleteBookMutation() {
  const queryClient = useQueryClient();
  return useMutation<TDeleteBookOutput, Error, TDeleteBookInput>({
    mutationFn: deleteBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useGetBooksQuery(params?: {
  search?: string;
  genre?: string;
  author?: string;
}) {
  return useQuery<TGetAllBooksOutput, Error>({
    queryKey: ["books", params?.search || "", params?.genre || "", params?.author || ""],
    queryFn: () => getAllBooks(params),
  });
}

// list of book in home page
export function useGetBooksHome() {
  return useQuery<TGetAllBooksOutput, Error>({
    queryKey: ["bookshome"],
    queryFn: () => getAllBooks(),
  });
}

/**
 * for get book by id api
 */
export function useGetBookByIdQuery(id: string) {
  return useQuery<TGetBookByIdOutput, Error>({
    queryKey: ["books", id],
    queryFn: () => getBookById({ bookId: id }),
    enabled: Boolean(id),
  });
}

export function useSearchSuggestionsQuery(query: string) {
  return useQuery<TSearchSuggestion[], Error>({
    queryKey: ["book-suggestions", query],
    queryFn: () => getSearchSuggestions(query),
    enabled: Boolean(query && query.trim().length >= 2),
    staleTime: 1000 * 60, // 1 minute
  });
}
