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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

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
      const [featRes, newRes] = await Promise.all([
        getAllBooks({ limit: 8, featured: true }),
        getAllBooks({ limit: 8, isNewArrival: true }),
      ]);
      setFeaturedBooks(featRes.data.length > 0 ? featRes.data : (await getAllBooks({ limit: 8 })).data);
      setNewArrivals(newRes.data.length > 0 ? newRes.data : (await getAllBooks({ limit: 8, page: 2 })).data);
    } catch (err) {
      console.error("Error loading homepage books:", err);
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
    });
    setToastMsg(`Added "${book.title}" to cart!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleWishlist = (book: TBook) => {
    toggleWishlist({
      _id: book._id,
      title: book.title,
      author: book.author,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      genre: book.genre,
    });
    setWishlistIds(getWishlist().map((item) => item._id));
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 min-h-screen transition-colors duration-150">
      <AppShell />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-fade-in text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMsg}</span>
          <Link
            to="/cart"
            className="ml-2 underline font-bold hover:text-emerald-100 text-xs uppercase tracking-wide"
          >
            View Cart
          </Link>
        </div>
      )}

      {/* ===================== HERO SECTION ===================== */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 dark:border-slate-900">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/10 dark:from-indigo-600/20 via-purple-600/10 dark:via-purple-600/20 to-pink-600/5 blur-[130px] pointer-events-none -z-10 rounded-full"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-600/10 blur-[100px] pointer-events-none -z-10 rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide shadow-xs">
                <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Nepal's Largest Online Bookstore & Community</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.12]">
                Discover Stories That <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400 bg-clip-text text-transparent">Inspire, Educate</span> & Transform.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Explore thousands of curated titles across fiction, business, psychology, and technology. Read genuine reviews from avid readers and enjoy express doorstep delivery.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/books"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" /> Browse Full Catalog
                </Link>
                <a
                  href="#featured"
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-slate-800 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  Trending Bestsellers <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Metric Counters */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">10,000+</div>
                  <div className="text-xs text-slate-500 font-medium">Titles in Stock</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">99.4%</div>
                  <div className="text-xs text-slate-500 font-medium">Positive Reviews</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">24-48h</div>
                  <div className="text-xs text-slate-500 font-medium">Express Courier</div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Stack */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-md h-[380px] sm:h-[440px] flex items-center justify-center">
                {/* Book Card 1 */}
                <div className="absolute left-4 sm:left-8 top-10 w-48 sm:w-56 h-64 sm:h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden -rotate-6 transform hover:rotate-0 transition-transform duration-300 z-10">
                  <AppImage
                    src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80"
                    alt="Book Cover Preview"
                    fallbackType="book"
                    fallbackTitle="Atomic Habits"
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
                </div>

                {/* Book Card 2 (Center Hero) */}
                <div className="absolute w-52 sm:w-60 h-72 sm:h-80 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-500/40 shadow-2xl shadow-indigo-500/20 overflow-hidden z-20 hover:scale-105 transition-transform duration-300">
                  <AppImage
                    src="https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&w=500&q=80"
                    alt="Featured Bestseller"
                    fallbackType="book"
                    fallbackTitle="The Psychology of Money"
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> 4.9 (1.2k Reviews)
                    </div>
                    <div className="text-sm font-bold text-white truncate">The Psychology of Money</div>
                  </div>
                </div>

                {/* Book Card 3 */}
                <div className="absolute right-4 sm:right-8 top-12 w-48 sm:w-56 h-64 sm:h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden rotate-6 transform hover:rotate-0 transition-transform duration-300 z-10">
                  <AppImage
                    src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80"
                    alt="Book Cover Preview 3"
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
      <section className="py-16 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Explore by Category
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                Popular Reading Genres
              </h2>
            </div>
            <Link
              to="/books"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              View All Categories <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {POPULAR_GENRES.map((genre) => {
              const Icon = genre.icon;
              return (
                <Link
                  key={genre.name}
                  to={`/books?genre=${encodeURIComponent(genre.name)}`}
                  className="group p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs hover:shadow-md transition-all duration-200 text-center flex flex-col items-center justify-center hover:-translate-y-1"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${genre.color} flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {genre.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    {genre.count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== FEATURED BESTSELLERS ===================== */}
      <section id="featured" className="py-20 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> Highly Recommended
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                Featured Bestsellers & Top Picks
              </h2>
            </div>
            <Link
              to="/books"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              See More Books <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 animate-pulse"
                ></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredBooks.map((book) => {
                const inWishlist = wishlistIds.includes(book._id);
                return (
                  <div
                    key={book._id}
                    className="book-card-hover group flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl dark:shadow-none relative overflow-hidden transition-colors"
                  >
                    {/* Wishlist Button */}
                    <button
                      onClick={() => handleToggleWishlist(book)}
                      className={`absolute top-6 right-6 z-20 p-2 rounded-xl backdrop-blur-md transition-colors ${inWishlist
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                        : "bg-white/80 dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
                        }`}
                      title={inWishlist ? "In Wishlist" : "Add to Wishlist"}
                    >
                      <Heart
                        className={`w-4 h-4 ${inWishlist ? "fill-white" : ""}`}
                      />
                    </button>

                    {/* Discount Badge */}
                    {book.discountPercentage && book.discountPercentage > 0 && (
                      <span className="absolute top-6 left-6 z-20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
                        {book.discountPercentage}% OFF
                      </span>
                    )}

                    <div>
                      {/* Thumbnail Container */}
                      <Link
                        to={`/books/${book._id}`}
                        className="block aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 mb-4 relative"
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
                      <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
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
                        className="block font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1 mb-0.5"
                      >
                        {book.title}
                      </Link>
                      <div className="text-xs text-slate-500 mb-3 truncate">
                        by {book.author}
                      </div>
                    </div>

                    {/* Price & Add to Cart */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                          NPR {book.price}
                        </div>
                        {book.stock !== undefined && (
                          <div
                            className={`text-[10px] font-semibold ${book.stock <= 0
                              ? "text-rose-500"
                              : book.stock <= 5
                                ? "text-amber-500"
                                : "text-emerald-600 dark:text-emerald-400"
                              }`}
                          >
                            {book.stock <= 0
                              ? "Out of stock"
                              : `${book.stock} in stock`}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddToCart(book)}
                        disabled={(book.stock ?? 1) <= 0}
                        className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
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
      <section className="py-20 bg-slate-100/60 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Fresh off the press
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                New Arrivals & Recent Publications
              </h2>
            </div>
            <Link
              to="/books"
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              Explore All Books <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {newArrivals.map((book) => {
              const inWishlist = wishlistIds.includes(book._id);
              return (
                <div
                  key={book._id}
                  className="book-card-hover group flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl dark:shadow-none relative overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => handleToggleWishlist(book)}
                    className={`absolute top-6 right-6 z-20 p-2 rounded-xl backdrop-blur-md transition-colors ${inWishlist
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                      : "bg-white/80 dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-950 border border-slate-200/80 dark:border-slate-800"
                      }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${inWishlist ? "fill-white" : ""}`}
                    />
                  </button>

                  <div>
                    <Link
                      to={`/books/${book._id}`}
                      className="block aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 mb-4 relative"
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

                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
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
                      className="block font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-purple-600 dark:hover:text-purple-400 transition-colors line-clamp-1 mb-0.5"
                    >
                      {book.title}
                    </Link>
                    <div className="text-xs text-slate-500 mb-3 truncate">
                      by {book.author}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                      NPR {book.price}
                    </div>
                    <button
                      onClick={() => handleAddToCart(book)}
                      disabled={(book.stock ?? 1) <= 0}
                      className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== READER TESTIMONIALS & COMMUNITY SPOTLIGHT ===================== */}
      <section className="py-20 border-b border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Reader Community
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Loved by Thousands of Readers
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              See what readers are saying about our bookstore collection, genuine verified reviews, and fast delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative flex flex-col justify-between">
              <div>
                <Quote className="w-8 h-8 text-indigo-500/40 mb-3" />
                <div className="flex text-amber-400 text-xs mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "KitabGhar made it so easy to get original psychology and finance books delivered right to Pokhara within 24 hours. The review community is genuinely insightful!"
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300">
                  AP
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Anish Pokhrel</div>
                  <div className="text-xs text-slate-500">Verified Reader • 14 Books Purchased</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative flex flex-col justify-between">
              <div>
                <Quote className="w-8 h-8 text-purple-500/40 mb-3" />
                <div className="flex text-amber-400 text-xs mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "The verified purchase badges give so much credibility to the reviews. I always check ratings here before picking my next weekend novel."
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-200 dark:border-purple-700 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300">
                  SS
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Sneha Shrestha</div>
                  <div className="text-xs text-slate-500">Avid Book Club Member</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg relative flex flex-col justify-between">
              <div>
                <Quote className="w-8 h-8 text-emerald-500/40 mb-3" />
                <div className="flex text-amber-400 text-xs mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "Smooth Khalti payment, live inventory counts, and reliable packaging. Hands down the best bookstore experience in Nepal!"
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                  RB
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Rohan Baral</div>
                  <div className="text-xs text-slate-500">Tech Lead & Reader</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CALL TO ACTION BANNER ===================== */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-8 sm:p-12 lg:p-16 border border-indigo-500/30 shadow-2xl overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Join the Community
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Ready to Start Your Next Reading Journey?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Create a free account to track your wishlist, write verified reviews, and earn reader badges.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                Join Free Today
              </Link>
              <Link
                to="/books"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-white font-bold text-sm border border-slate-700 transition-all"
              >
                Explore Books
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default HomePage;
