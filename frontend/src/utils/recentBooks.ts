import { TBook } from "../api/book/fetch";

const RECENT_BOOKS_KEY = "bookstore_recent_books";
const MAX_RECENT_BOOKS = 8;

export interface RecentBookItem {
  _id: string;
  title: string;
  author: string;
  genre?: string;
  price: number;
  discountPercentage?: number;
  image?: string;
  averageRating?: number;
  viewedAt: number;
}

export function getRecentlyViewedBooks(): RecentBookItem[] {
  try {
    const raw = localStorage.getItem(RECENT_BOOKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewedBook(book: Partial<TBook> & { _id: string; title: string; price: number; author: string }) {
  try {
    const current = getRecentlyViewedBooks();
    const filtered = current.filter((b) => b._id !== book._id);
    const newItem: RecentBookItem = {
      _id: book._id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      averageRating: book.averageRating,
      viewedAt: Date.now(),
    };
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_BOOKS);
    localStorage.setItem(RECENT_BOOKS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save recently viewed book", err);
  }
}

export function clearRecentlyViewedBooks() {
  try {
    localStorage.removeItem(RECENT_BOOKS_KEY);
  } catch {}
}
