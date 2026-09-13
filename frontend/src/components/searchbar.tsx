import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, BookOpen, Star, Loader2, ArrowRight } from "lucide-react";
import { useSearchSuggestionsQuery } from "../api/book/query";
import { useDebounce } from "../utils/useDebounce";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearchSubmit?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  className = "",
  placeholder = "Search books, authors, genres...",
  onSearchSubmit,
}) => {
  const [query, setQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const debouncedQuery = useDebounce(query, 250);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isLoading } = useSearchSuggestionsQuery(debouncedQuery);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      const selected = suggestions[selectedIndex];
      navigate(`/books/${selected._id}`);
    } else {
      navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
    }

    setIsOpen(false);
    inputRef.current?.blur();
    if (onSearchSubmit) onSearchSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== "Escape") {
      setIsOpen(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelectBook = (bookId: string) => {
    navigate(`/books/${bookId}`);
    setIsOpen(false);
    if (onSearchSubmit) onSearchSubmit();
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-md ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <label htmlFor="global-search-input" className="sr-only">
          Search books, authors, genres
        </label>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="global-search-input"
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen && (suggestions.length > 0 || isLoading)}
          aria-autocomplete="list"
          aria-controls="search-suggestions-list"
          aria-activedescendant={
            selectedIndex >= 0 ? `suggestion-item-${selectedIndex}` : undefined
          }
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-100"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {isLoading && debouncedQuery.trim().length >= 2 && (
          <Loader2
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4 animate-spin"
            aria-label="Loading search results"
          />
        )}

        {!isLoading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && debouncedQuery.trim().length >= 2 && (
        <div
          id="search-suggestions-list"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {suggestions.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Books & Authors
              </div>
              <ul className="divide-y divide-slate-50">
                {suggestions.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <li
                      id={`suggestion-item-${index}`}
                      key={item._id}
                      role="option"
                      aria-selected={isSelected}
                      className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-indigo-50/80 text-indigo-950" : "hover:bg-slate-50 text-slate-800"
                      }`}
                      onClick={() => handleSelectBook(item._id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="w-9 h-12 object-cover rounded-md shadow-xs flex-shrink-0 bg-slate-100"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-9 h-12 bg-indigo-50 text-indigo-500 rounded-md flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-slate-900 group-hover:text-indigo-600">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                          <span>by {item.author}</span>
                          {item.genre && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">{item.genre}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-slate-900">${item.price.toFixed(2)}</div>
                        {item.averageRating ? (
                          <div className="flex items-center justify-end text-amber-500 text-xs font-medium gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 stroke-none" />
                            <span>{item.averageRating.toFixed(1)}</span>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="p-2 border-t border-slate-100 bg-slate-50/70 mt-1">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 rounded-lg transition-colors"
                >
                  <span>See all matching results for &ldquo;{debouncedQuery}&rdquo;</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : !isLoading ? (
            <div className="px-4 py-6 text-center text-slate-500 text-sm">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No books found for &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try checking for spelling or searching by category.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
