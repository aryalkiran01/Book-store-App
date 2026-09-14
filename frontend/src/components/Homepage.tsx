/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Compass,
  Star,
  ShoppingBag,
  Heart,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  BookMarked,
  Layers,
  Quote,
  Flame,
  Award,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "./AppShell";
import { Footer } from "../pages/Footer";
import { getAllBooks, TBook } from "../api/book/fetch";
import { addToCart, toggleWishlist, getWishlist } from "../utils/cartStorage";
import { useSEO } from "../utils/useSEO";
import { AppImage } from "./common/AppImage";

const POPULAR_GENRES = [
  { name: "Fiction", icon: BookMarked, count: "1,200+ Books", color: "from-blue-600 to-indigo-600" },
  { name: "Business & Investing", icon: TrendingUp, count: "850+ Books", color: "from-emerald-600 to-teal-600" },
  { name: "Self-Help", icon: Sparkles, count: "950+ Books", color: "from-amber-600 to-orange-600" },
  { name: "Science Fiction", icon: Layers, count: "620+ Books", color: "from-purple-600 to-pink-600" },
  { name: "Biography", icon: Award, count: "480+ Books", color: "from-rose-600 to-red-600" },
  { name: "Technology", icon: Compass, count: "740+ Books", color: "from-cyan-600 to-blue-600" },
];

export function HomePage() {
  useSEO({
    title: "Explore, Review & Buy Books",
    description: "Discover bestsellers, authentic reader reviews, top fiction, and non-fiction titles with express doorstep delivery.",
  });

  const [featuredBooks, setFeaturedBooks] = useState<TBook[]>([]);
  const [newArrivals, setNewArrivals] = useState<TBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [activeHeartPopId, setActiveHeartPopId] = useState<string | null>(null);

  useEffect(() => {
    loadBooks();
    syncWishlist();

    const handleUpdate = () => syncWishlist();
    window.addEventListener("cart-wishlist-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("cart-wishlist-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const syncWishlist = () => {
    try {
      const raw = localStorage.getItem("wishlist");
      if (raw) {
        const list = JSON.parse(raw);
        setWishlistIds(list.map((item: any) => item._id));
      } else {
        setWishlistIds([]);
      }
    } catch {
      setWishlistIds([]);
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [featRes, newRes] = await Promise.all([
        getAllBooks({ limit: 8, featured: true }),
        getAllBooks({ limit: 8, isNewArrival: true }),
      ]);
      setFeaturedBooks(featRes.data.length > 0 ? featRes.data : (await getAllBooks({ limit: 8 })).data);
      setNewArrivals(newRes.data.length > 0 ? newRes.data : (await getAllBooks({ limit: 8, page: 2 })).data);
    } catch (err: any) {
      console.error("Error loading homepage books:", err);
      setError(err?.message || "Unable to load latest books. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (book: TBook) => {
    addToCart({
      _id: book._id,
      title: book.title,
      author: book.author,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      stock: book.stock,
      isbn: book.isbn,
      openLibraryId: book.openLibraryId,
      coverId: book.coverId,
    });
    setToastMsg(`Added "${book.title}" to cart!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleWishlist = (book: TBook) => {
    setActiveHeartPopId(book._id);
    setTimeout(() => setActiveHeartPopId(null), 350);

    toggleWishlist({
      _id: book._id,
      title: book.title,
      author: book.author,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      genre: book.genre,
      isbn: book.isbn,
      openLibraryId: book.openLibraryId,
      coverId: book.coverId,
    });
    setWishlistIds(getWishlist().map((item) => item._id));
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 min-h-screen transition-colors duration-150">
      <AppShell />

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-fade-in text-sm font-semibold"
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 animate-check-pop" />
          <span>{toastMsg}</span>
          <Link
            to="/cart"
            className="ml-2 underline font-bold hover:text-emerald-100 text-xs uppercase tracking-wide focus-ring rounded"
          >
            View Cart
          </Link>
        </div>
      )}

      <main id="main-content">
        {/* ===================== HERO SECTION ===================== */}
        <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-20 lg:pb-28 border-b border-slate-200 dark:border-slate-900">
          {/* Ambient Gradient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[250px] sm:h-[350px] bg-gradient-to-tr from-indigo-600/10 dark:from-indigo-600/20 via-purple-600/10 dark:via-purple-600/20 to-pink-600/5 blur-[100px] sm:blur-[130px] pointer-events-none -z-10 rounded-full"></div>
          <div className="absolute top-10 right-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-600/10 blur-[80px] pointer-events-none -z-10 rounded-full"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Hero Content */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300 text-[11px] sm:text-xs font-bold tracking-wide shadow-xs">
                  <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                  <span className="truncate">Nepal's Largest Online Bookstore & Community</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.15]">
                  Discover Stories That{" "}
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400 bg-clip-text text-transparent">
                    Inspire, Educate
                  </span>{" "}
                  & Transform.
                </h1>

                <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Explore thousands of curated titles across fiction, business, psychology, and technology. Read genuine reviews from avid readers and enjoy express doorstep delivery across Nepal.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 sm:pt-2">
                  <Link
                    to="/books"
                    className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all focus-ring btn-press flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> Browse Full Catalog
                  </Link>
                  <a
                    href="#featured"
                    className="w-full sm:w-auto px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-800 shadow-sm transition-all focus-ring btn-press flex items-center justify-center gap-2"
                  >
                    Trending Bestsellers <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

                {/* Metric Counters */}
                <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto lg:mx-0">
                  <div>
                    <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">10,000+</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Titles in Stock</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">99.4%</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Positive Reviews</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">24-48h</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">Express Delivery</div>
                  </div>
                </div>
              </div>

              {/* Right Hero Visual Stack */}
              <div className="lg:col-span-5 relative flex items-center justify-center mt-6 lg:mt-0">
                <div className="relative w-full max-w-[320px] sm:max-w-md h-[300px] sm:h-[420px] flex items-center justify-center">
                  {/* Book Card 1 */}
                  <div className="absolute left-2 sm:left-8 top-6 sm:top-10 w-36 sm:w-56 h-48 sm:h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden -rotate-6 transform hover:rotate-0 transition-transform duration-200 z-10">
                    <AppImage
                      src="https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg"
                      isbn="9780735211292"
                      alt="Atomic Habits Cover Preview"
                      fallbackType="book"
                      fallbackTitle="Atomic Habits"
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  </div>

                  {/* Book Card 2 (Center Hero) */}
                  <div className="absolute w-44 sm:w-60 h-60 sm:h-80 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-500/40 shadow-2xl shadow-indigo-500/20 overflow-hidden z-20 hover:scale-105 transition-transform duration-200">
                    <AppImage
                      src="https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg"
                      isbn="9780857197689"
                      alt="The Psychology of Money Cover"
                      fallbackType="book"
                      fallbackTitle="The Psychology of Money"
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                      <div className="text-[10px] sm:text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-amber-400" /> 4.9 (1.2k Reviews)
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white truncate">The Psychology of Money</div>
                    </div>
                  </div>

                  {/* Book Card 3 */}
                  <div className="absolute right-2 sm:right-8 top-8 sm:top-12 w-36 sm:w-56 h-48 sm:h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rotate-6 transform hover:rotate-0 transition-transform duration-200 z-10">
                    <AppImage
                      src="https://covers.openlibrary.org/b/isbn/9789389109962-L.jpg"
                      isbn="9789389109962"
                      alt="Karnali Blues Cover Preview"
                      fallbackType="book"
                      fallbackTitle="Karnali Blues"
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== POPULAR GENRES ===================== */}
        <section className="py-12 sm:py-16 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-900 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Explore by Category
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  Popular Reading Genres
                </h2>
              </div>
              <Link
                to="/books"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 focus-ring rounded"
              >
                View All Categories <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {POPULAR_GENRES.map((genre) => {
                const Icon = genre.icon;
                return (
                  <Link
                    key={genre.name}
                    to={`/books?genre=${encodeURIComponent(genre.name)}`}
                    className="group p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs hover:shadow-md transition-all duration-200 text-center flex flex-col items-center justify-center hover:-translate-y-1 focus-ring"
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr ${genre.color} flex items-center justify-center text-white mb-2 sm:mb-3 shadow-md group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {genre.name}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                      {genre.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== FEATURED BESTSELLERS ===================== */}
        <section id="featured" className="py-14 sm:py-20 border-b border-slate-200 dark:border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 mb-8 sm:mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> Highly Recommended
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  Featured Bestsellers & Top Picks
                </h2>
              </div>
              <Link
                to="/books"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 focus-ring rounded"
              >
                See More Books <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Error State */}
            {error ? (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center max-w-lg mx-auto space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
                <button
                  onClick={loadBooks}
                  className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 transition inline-flex items-center gap-1.5 focus-ring btn-press"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-80 sm:h-96 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 skeleton-shimmer"
                  ></div>
                ))}
              </div>
            ) : featuredBooks.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md mx-auto">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No featured books found</h3>
                <p className="text-xs text-slate-500 mt-1">Check back soon as we restock our top collections.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {featuredBooks.map((book) => {
                  const inWishlist = wishlistIds.includes(book._id);
                  const isHeartPopping = activeHeartPopId === book._id;
                  return (
                    <div
                      key={book._id}
                      className="book-card-hover group flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm hover:shadow-xl dark:shadow-none relative overflow-hidden transition-colors"
                    >
                      {/* Wishlist Button */}
                      <button
                        onClick={() => handleToggleWishlist(book)}
                        aria-label={inWishlist ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
                        className={`absolute top-4 sm:top-6 right-4 sm:right-6 z-20 p-2 rounded-xl backdrop-blur-md transition-colors focus-ring btn-press ${
                          inWishlist
                            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                            : "bg-white/80 dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
                        }`}
                        title={inWishlist ? "In Wishlist" : "Add to Wishlist"}
                      >
                        <Heart
                          className={`w-4 h-4 ${inWishlist ? "fill-white" : ""} ${
                            isHeartPopping ? "animate-pop-heart" : ""
                          }`}
                        />
                      </button>

                      {/* Discount Badge */}
                      {book.discountPercentage && book.discountPercentage > 0 && (
                        <span className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
                          {book.discountPercentage}% OFF
                        </span>
                      )}

                      <div>
                        {/* Thumbnail Container */}
                        <Link
                          to={`/books/${book._id}`}
                          aria-label={`View details for ${book.title}`}
                          className="block aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 mb-3 sm:mb-4 relative focus-ring"
                        >
                          <AppImage
                            src={book.image}
                            isbn={book.isbn}
                            author={book.author}
                            genre={book.genre}
                            alt={book.title}
                            fallbackType="book"
                            fallbackTitle={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            containerClassName="w-full h-full"
                          />
                        </Link>

                        {/* Genre & Rating */}
                        <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px] sm:text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                            {book.genre || "Fiction"}
                          </span>
                          <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold flex-shrink-0">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{book.rating?.toFixed(1) || "5.0"}</span>
                          </div>
                        </div>

                        {/* Title & Author */}
                        <Link
                          to={`/books/${book._id}`}
                          className="block font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 mb-0.5 focus-ring rounded"
                        >
                          {book.title}
                        </Link>
                        <div className="text-[11px] sm:text-xs text-slate-500 mb-2 sm:mb-3 truncate">
                          by {book.author}
                        </div>
                      </div>

                      {/* Price & Add to Cart */}
                      <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            NPR {book.price}
                          </div>
                          {book.stock !== undefined && (
                            <div
                              className={`text-[9px] sm:text-[10px] font-semibold ${
                                book.stock <= 0
                                  ? "text-rose-500"
                                  : book.stock <= 5
                                  ? "text-amber-500"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {book.stock <= 0 ? "Out of stock" : `${book.stock} in stock`}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleAddToCart(book)}
                          disabled={(book.stock ?? 1) <= 0}
                          aria-label={`Add ${book.title} to Cart`}
                          className="p-2 sm:p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all focus-ring btn-press disabled:opacity-40 disabled:pointer-events-none"
                          title="Add to Cart"
                        >
                          <ShoppingBag className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===================== NEW RELEASES SECTION ===================== */}
        <section className="py-14 sm:py-20 bg-slate-100/60 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-900 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 mb-8 sm:mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Fresh off the press
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  New Arrivals & Recent Publications
                </h2>
              </div>
              <Link
                to="/books"
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 focus-ring rounded"
              >
                Explore All Books <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {newArrivals.map((book) => {
                const inWishlist = wishlistIds.includes(book._id);
                const isHeartPopping = activeHeartPopId === book._id;
                return (
                  <div
                    key={book._id}
                    className="book-card-hover group flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm hover:shadow-xl dark:shadow-none relative overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => handleToggleWishlist(book)}
                      aria-label={inWishlist ? `Remove ${book.title} from wishlist` : `Add ${book.title} to wishlist`}
                      className={`absolute top-4 sm:top-6 right-4 sm:right-6 z-20 p-2 rounded-xl backdrop-blur-md transition-colors focus-ring btn-press ${
                        inWishlist
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                          : "bg-white/80 dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${inWishlist ? "fill-white" : ""} ${
                          isHeartPopping ? "animate-pop-heart" : ""
                        }`}
                      />
                    </button>

                    <div>
                      <Link
                        to={`/books/${book._id}`}
                        aria-label={`View details for ${book.title}`}
                        className="block aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 mb-3 sm:mb-4 relative focus-ring"
                      >
                        <AppImage
                          src={book.image}
                          isbn={book.isbn}
                          author={book.author}
                          genre={book.genre}
                          alt={book.title}
                          fallbackType="book"
                          fallbackTitle={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          containerClassName="w-full h-full"
                        />
                      </Link>

                      <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px] sm:text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                          {book.genre || "Fiction"}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{book.rating?.toFixed(1) || "5.0"}</span>
                        </div>
                      </div>

                      <Link
                        to={`/books/${book._id}`}
                        className="block font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm hover:text-purple-600 dark:hover:text-purple-400 transition-colors line-clamp-1 mb-0.5 focus-ring rounded"
                      >
                        {book.title}
                      </Link>
                      <div className="text-[11px] sm:text-xs text-slate-500 mb-2 sm:mb-3 truncate">
                        by {book.author}
                      </div>
                    </div>

                    <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                        NPR {book.price}
                      </div>
                      <button
                        onClick={() => handleAddToCart(book)}
                        disabled={(book.stock ?? 1) <= 0}
                        aria-label={`Add ${book.title} to Cart`}
                        className="p-2 sm:p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all focus-ring btn-press disabled:opacity-40"
                      >
                        <ShoppingBag className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== READER TESTIMONIALS ===================== */}
        <section className="py-14 sm:py-20 border-b border-slate-200 dark:border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Reader Community
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                Loved by Thousands of Readers
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
                See what readers are saying about our bookstore collection, genuine verified reviews, and fast delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative flex flex-col justify-between">
                <div>
                  <Quote className="w-7 sm:w-8 h-7 sm:h-8 text-indigo-500/40 mb-3" />
                  <div className="flex text-amber-400 text-xs mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "KitabGhar made it so easy to get original psychology and finance books delivered right to Pokhara within 24 hours. The review community is genuinely insightful!"
                  </p>
                </div>
                <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm">
                    AP
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Anish Pokhrel</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">Verified Reader • 14 Books Purchased</div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative flex flex-col justify-between">
                <div>
                  <Quote className="w-7 sm:w-8 h-7 sm:h-8 text-purple-500/40 mb-3" />
                  <div className="flex text-amber-400 text-xs mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "The verified purchase badges give so much credibility to the reviews. I always check ratings here before picking my next weekend novel."
                  </p>
                </div>
                <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-700 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-xs sm:text-sm">
                    SS
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Sneha Shrestha</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">Avid Book Club Member</div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative flex flex-col justify-between">
                <div>
                  <Quote className="w-7 sm:w-8 h-7 sm:h-8 text-emerald-500/40 mb-3" />
                  <div className="flex text-amber-400 text-xs mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "Smooth Khalti payment, live inventory counts, and reliable packaging. Hands down the best bookstore experience in Nepal!"
                  </p>
                </div>
                <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm">
                    RB
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Rohan Baral</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">Tech Lead & Reader</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== CALL TO ACTION BANNER ===================== */}
        <section className="py-14 sm:py-20 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-6 sm:p-12 lg:p-16 border border-indigo-500/30 shadow-2xl overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
              <div className="space-y-3 sm:space-y-4 max-w-xl">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Join the Community
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Ready to Start Your Next Reading Journey?
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Create a free account to track your wishlist, write verified reviews, and earn reader badges.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 shadow-xl transition-all focus-ring btn-press"
                >
                  Join Free Today
                </Link>
                <Link
                  to="/books"
                  className="w-full sm:w-auto px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-white font-bold text-sm border border-slate-700 transition-all focus-ring btn-press"
                >
                  Explore Books
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HomePage;
