import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Star, Trash2 } from "lucide-react";
import { getRecentlyViewedBooks, clearRecentlyViewedBooks, RecentBookItem } from "../utils/recentBooks";
import { AppImage } from "./common/AppImage";

interface RecentlyViewedProps {
  currentBookId?: string;
  className?: string;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ currentBookId, className = "" }) => {
  const [books, setBooks] = useState<RecentBookItem[]>([]);

  useEffect(() => {
    const list = getRecentlyViewedBooks();
    // Filter out current book if browsing book details
    const filtered = currentBookId ? list.filter((b) => b._id !== currentBookId) : list;
    setBooks(filtered);
  }, [currentBookId]);

  const handleClear = () => {
    clearRecentlyViewedBooks();
    setBooks([]);
  };

  if (books.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className={`py-8 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h2 id="recently-viewed-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Recently Viewed
          </h2>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
          aria-label="Clear recently viewed books history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {books.map((book) => (
          <Link
            key={book._id}
            to={`/books/${book._id}`}
            className="group block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:shadow-lg dark:hover:border-slate-700 hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-2 relative">
              <AppImage
                src={book.image}
                alt={`Cover of ${book.title}`}
                fallbackType="book"
                fallbackTitle={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                containerClassName="w-full h-full"
              />
              {book.discountPercentage ? (
                <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-20">
                  -{book.discountPercentage}%
                </span>
              ) : null}
            </div>

            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {book.title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">{book.author}</p>

            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">NPR {book.price.toFixed(2)}</span>
              {book.averageRating ? (
                <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
                  <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
                  <span>{book.averageRating.toFixed(1)}</span>
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
