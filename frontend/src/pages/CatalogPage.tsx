import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAllBooks, getGenres, TBook, PaginationMeta } from "../api/book/fetch";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Star,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RotateCcw,
  Heart,
} from "lucide-react";
import {
  addToCart as addCartItem,
  toggleWishlist,
  isInWishlist,
} from "../utils/cartStorage";
import { RecentlyViewed } from "../components/RecentlyViewed";
import { useSEO } from "../utils/useSEO";
import { AppImage } from "../components/common/AppImage";

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter and Query States
  const initialSearch = searchParams.get("search") || "";
  const initialGenre = searchParams.get("genre") || "All";
  const initialSort = searchParams.get("sortBy") || "newest";
  const initialPage = Number(searchParams.get("page")) || 1;

  useSEO({
    title: initialSearch ? `Search "${initialSearch}"` : initialGenre !== "All" ? `${initialGenre} Books` : "Book Catalog",
    description: `Browse our extensive collection of books${initialGenre !== 'All' ? ` in ${initialGenre}` : ''}. Filter by genre, rating, and price.`,
  });

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [inStockOnly, setInStockOnly] = useState(searchParams.get("inStock") === "true");
  const [minPrice, setMinPrice] = useState<string>(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get("maxPrice") || "");
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Data states
  const [books, setBooks] = useState<TBook[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load genres once on mount
  useEffect(() => {
    getGenres()
      .then((gList) => setGenres(["All", ...gList]))
      .catch((e) => console.error("Failed to load genres:", e));
  }, []);

  // Sync state with URL params & fetch books
  useEffect(() => {
    fetchBooks();
  }, [selectedGenre, selectedSort, inStockOnly, currentPage, searchParams]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: 12,
        sortBy: selectedSort as any,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedGenre && selectedGenre !== "All") params.genre = selectedGenre;
      if (inStockOnly) params.inStock = true;
      if (minPrice && !isNaN(Number(minPrice))) params.minPrice = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) params.maxPrice = Number(maxPrice);

      const res = await getAllBooks(params);
      if (res.isSuccess && res.data) {
        setBooks(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || "Failed to load books");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching books");
    } finally {
      setLoading(false);
    }
  };

  const updateUrlParams = (newParams: Record<string, string | number | boolean | undefined>) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "All" || v === false) {
        updated.delete(k);
      } else {
        updated.set(k, String(v));
      }
    });
    setSearchParams(updated);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    updateUrlParams({ search: searchQuery.trim(), page: 1 });
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setCurrentPage(1);
    updateUrlParams({ genre: genre === "All" ? undefined : genre, page: 1 });
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
    setCurrentPage(1);
    updateUrlParams({ sortBy: sort, page: 1 });
  };

  const handlePriceApply = () => {
    setCurrentPage(1);
    updateUrlParams({ minPrice, maxPrice, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedGenre("All");
    setSelectedSort("newest");
    setInStockOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleAddToCart = (book: TBook, e: React.MouseEvent) => {
    e.stopPropagation();
    addCartItem({
      _id: book._id,
      title: book.title,
      author: book.author,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      stock: book.stock,
    });
    setToastMsg(`Added "${book.title}" to cart!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleWishlist = (book: TBook, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist({
      _id: book._id,
      title: book.title,
      author: book.author,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      genre: book.genre,
    });
    // Trigger render update
    setBooks([...books]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col transition-colors duration-150">
      <AppShell />

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-fade-in text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-b from-indigo-50 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800/80 py-10 px-4 sm:px-6 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1 rounded-full inline-block mb-3">
              Explore Our Collection
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Book Store Catalog
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Discover bestsellers, new releases, Nepali literature, and academic titles.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, genre, ISBN..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-3 pl-11 pr-24 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <button
              type="submit"
              className="absolute right-2 top-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Controls Header & Mobile Filter Trigger */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs dark:shadow-none transition-colors">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {pagination ? (
                <>
                  Showing <span className="text-slate-900 dark:text-white font-bold">{books.length}</span> of{" "}
                  <span className="text-slate-900 dark:text-white font-bold">{pagination.total}</span> books
                </>
              ) : (
                `${books.length} books found`
              )}
            </span>

            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              <Filter size={14} /> Filters
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <SlidersHorizontal size={14} /> Sort By:
            </label>
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden md:block md:col-span-3 space-y-6">
            {/* Active Filters / Reset */}
            {(selectedGenre !== "All" || searchQuery || inStockOnly || minPrice || maxPrice) && (
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xs dark:shadow-none">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Filters Active</span>
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-rose-500 dark:text-rose-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Reset All
                </button>
              </div>
            )}

            {/* In-Stock Filter */}
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs dark:shadow-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Availability</h3>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                    updateUrlParams({ inStock: e.target.checked, page: 1 });
                  }}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-950"
                />
                In Stock Only
              </label>
            </div>

            {/* Price Range Filter */}
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs dark:shadow-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Price Range (NPR)</h3>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handlePriceApply}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Apply Price
              </button>
            </div>

            {/* Genre / Categories Filter */}
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs dark:shadow-none">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Categories & Genres</h3>
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1 text-sm">
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleGenreChange(g)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                      selectedGenre === g
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{g}</span>
                    {selectedGenre === g && <CheckCircle2 size={13} />}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Book Catalog Grid & Pagination */}
          <section className="md:col-span-9 flex flex-col justify-between">
            {/* Loading Skeleton */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 animate-pulse">
                    <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-800 rounded-xl mb-3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mt-4"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Failed to load books</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchBooks}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition"
                >
                  Retry
                </button>
              </div>
            ) : books.length === 0 ? (
              /* Empty Search / Filter State */
              <div className="text-center py-20 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xs dark:shadow-none">
                <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matching books found</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm mx-auto mb-6">
                  We couldn't find any titles matching your search criteria. Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition inline-flex items-center gap-2"
                >
                  <RotateCcw size={16} /> Reset All Filters
                </button>
              </div>
            ) : (
              /* Books Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {books.map((book) => {
                  const effectivePrice =
                    book.discountPercentage && book.discountPercentage > 0
                      ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
                      : book.price;
                  const inStock = (book.stock ?? 20) > 0;

                  return (
                    <div
                      key={book._id}
                      onClick={() => navigate(`/books/${book._id}`)}
                      className="group bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-xl dark:hover:shadow-2xl hover:-translate-y-1 transition duration-300 cursor-pointer"
                    >
                      <div>
                        {/* Cover Image Container */}
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <AppImage
                            src={book.image}
                            alt={book.title}
                            fallbackType="book"
                            fallbackTitle={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            containerClassName="w-full h-full"
                          />
                          {book.discountPercentage ? (
                            <span className="absolute top-2 left-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md z-20">
                              {book.discountPercentage}% OFF
                            </span>
                          ) : null}

                          {/* Wishlist Heart Button */}
                          <button
                            onClick={(e) => handleToggleWishlist(book, e)}
                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-slate-950/80 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-rose-500 transition shadow backdrop-blur-md z-20"
                            title="Save to wishlist"
                          >
                            <Heart
                              size={14}
                              className={
                                isInWishlist(book._id)
                                  ? "fill-rose-500 text-rose-500"
                                  : ""
                              }
                            />
                          </button>
                        </div>

                        {/* Genre Tag */}
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block truncate mb-1">
                          {book.genre?.split(",")[0] || "General"}
                        </span>

                        {/* Title & Author */}
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-0.5">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">by {book.author}</p>

                        {/* Rating Stars */}
                        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs mb-3">
                          <Star size={12} className="fill-amber-400" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {book.averageRating ? book.averageRating.toFixed(1) : "0.0"}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            ({book.totalReviews || 0})
                          </span>
                        </div>
                      </div>

                      <div>
                        {/* Price Display */}
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="font-extrabold text-base text-slate-900 dark:text-white">
                            NPR {effectivePrice.toLocaleString()}
                          </span>
                          {book.discountPercentage ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                              NPR {book.price.toLocaleString()}
                            </span>
                          ) : null}
                        </div>

                        {/* Card Action */}
                        <button
                          disabled={!inStock}
                          onClick={(e) => handleAddToCart(book, e)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                            inStock
                              ? "bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 dark:text-slate-200 dark:hover:text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                          }`}
                        >
                          <ShoppingCart size={13} />
                          {inStock ? "Add to Cart" : "Out of Stock"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  disabled={!pagination.hasPrev}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    updateUrlParams({ page: Math.max(1, currentPage - 1) });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
                >
                  <ChevronLeft size={18} />
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => {
                      setCurrentPage(pageNumber);
                      updateUrlParams({ page: pageNumber });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition ${
                      pagination.page === pageNumber
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  disabled={!pagination.hasNext}
                  onClick={() => {
                    setCurrentPage((p) => p + 1);
                    updateUrlParams({ page: currentPage + 1 });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </section>
        </div>

        <RecentlyViewed className="mt-12 border-t border-slate-200 dark:border-slate-800/80 pt-8" />
      </main>

      {/* Mobile Filters Slide-over Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs h-full p-6 overflow-y-auto space-y-6 text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold">Filter Books</h2>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Genre List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Genres</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {genres.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      handleGenreChange(g);
                      setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium ${
                      selectedGenre === g
                        ? "bg-indigo-600 text-white font-bold"
                        : "text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Price & In Stock */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Availability</h3>
              <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    updateUrlParams({ inStock: e.target.checked, page: 1 });
                  }}
                  className="w-4 h-4 rounded"
                />
                In Stock Only
              </label>
            </div>

            <button
              onClick={() => setMobileFilterOpen(false)}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CatalogPage;
