import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getBookById, getAllBooks, TBook } from "../api/book/fetch";
import {
  getReviews,
  addReview,
  updateReviewBook,
  deleteReviewBook,
  toggleHelpfulReview,
  reportReview,
  TReview,
  ReviewStats,
  ReviewPagination,
} from "../api/review/fetch";
import { useUserDetailsStore } from "../store/useUsersDetails";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import {
  Star,
  Heart,
  ShoppingCart,
  Truck,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  Calendar,
  Building,
  Globe,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  Flag,
  Edit3,
  Trash2,
  Check,
  Zap,
  User,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquarePlus,
} from "lucide-react";
import { addToCart, isInWishlist, toggleWishlist } from "../utils/cartStorage";
import { addRecentlyViewedBook } from "../utils/recentBooks";
import { RecentlyViewed } from "../components/RecentlyViewed";

export function BookDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userDetails, isAuthenticated, isAdmin } = useUserDetailsStore();

  const [book, setBook] = useState<TBook | null>(null);
  const [reviews, setReviews] = useState<TReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [pagination, setPagination] = useState<ReviewPagination | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<TBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [quantity, setQuantity] = useState(1);
  const [addedToCartToast, setAddedToCartToast] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  // Review Filtering & Sorting states
  const [reviewPage, setReviewPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "rating-high" | "rating-low" | "most-helpful"
  >("newest");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Review Form (Write / Edit) states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [titleInput, setTitleInput] = useState("");
  const [reviewTextInput, setReviewTextInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Report Modal state
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Delete Confirmation state
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadBookData(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    if (book) {
      setWishlisted(isInWishlist(book._id));
    }
    const syncWishlist = () => {
      if (book) setWishlisted(isInWishlist(book._id));
    };
    window.addEventListener("cart-wishlist-update", syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener("cart-wishlist-update", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [book]);

  useEffect(() => {
    if (id) {
      loadReviews(id, reviewPage, sortBy, ratingFilter, verifiedOnly);
    }
  }, [id, reviewPage, sortBy, ratingFilter, verifiedOnly]);

  const loadBookData = async (bookId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBookById({ bookId });

      if (res.isSuccess && res.data) {
        const bookObj = res.data.result || res.data;
        setBook(bookObj);
        setWishlisted(isInWishlist(bookObj._id));
        addRecentlyViewedBook(bookObj);

        // Fetch related books by genre
        if (bookObj.genre) {
          const firstGenre = bookObj.genre.split(",")[0].trim();
          const relRes = await getAllBooks({
            genre: firstGenre,
            limit: 4,
          });
          if (relRes.isSuccess && relRes.data) {
            const relList = Array.isArray(relRes.data)
              ? relRes.data
              : (relRes.data as any).result || [];
            setRelatedBooks(
              relList.filter((b: TBook) => b._id !== bookObj._id).slice(0, 3)
            );
          }
        }
      } else {
        setError(res.message || "Failed to load book information.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (
    bookId: string,
    page: number,
    sort: typeof sortBy,
    starFilter?: number,
    verified?: boolean
  ) => {
    try {
      setLoadingReviews(true);
      const res = await getReviews(bookId, {
        page,
        limit: 8,
        sortBy: sort,
        ratingFilter: starFilter,
        verifiedOnly: verified,
      });

      if (res.isSuccess) {
        setReviews(res.data || []);
        if (res.stats) setReviewStats(res.stats);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddToCart = (redirectCheckout = false) => {
    if (!book) return;
    addToCart(
      {
        _id: book._id,
        title: book.title,
        author: book.author,
        price: book.price,
        discountPercentage: book.discountPercentage,
        image: book.image,
        stock: book.stock,
      },
      quantity
    );

    if (redirectCheckout) {
      navigate("/checkout");
    } else {
      setAddedToCartToast(true);
      setTimeout(() => setAddedToCartToast(false), 3000);
    }
  };

  const handleToggleWishlist = () => {
    if (!book) return;
    const isNowInWishlist = toggleWishlist({
      _id: book._id,
      title: book.title,
      author: book.author,
      price: book.price,
      discountPercentage: book.discountPercentage,
      image: book.image,
      stock: book.stock,
      genre: book.genre,
      rating: book.averageRating,
    });
    setWishlisted(isNowInWishlist);
  };

  const handleOpenReviewForm = (existingRev?: TReview) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (existingRev) {
      setEditingReviewId(existingRev._id);
      setRatingInput(existingRev.rating);
      setTitleInput(existingRev.title || "");
      setReviewTextInput(existingRev.reviewText);
    } else {
      setEditingReviewId(null);
      setRatingInput(5);
      setTitleInput("");
      setReviewTextInput("");
    }
    setReviewMsg(null);
    setShowReviewForm(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !book) return;

    if (!reviewTextInput.trim()) {
      setReviewMsg({
        type: "error",
        text: "Review text cannot be empty.",
      });
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewMsg(null);

      if (editingReviewId) {
        // Update review
        const res = await updateReviewBook({
          reviewId: editingReviewId,
          rating: ratingInput,
          title: titleInput.trim() || undefined,
          reviewText: reviewTextInput.trim(),
        });

        if (res.isSuccess) {
          setReviewMsg({
            type: "success",
            text: "Your review was updated successfully!",
          });
          setTimeout(() => {
            setShowReviewForm(false);
            setEditingReviewId(null);
          }, 1200);
          loadBookData(id);
          loadReviews(id, reviewPage, sortBy, ratingFilter, verifiedOnly);
        }
      } else {
        // Add new review
        const res = await addReview({
          bookId: id,
          rating: ratingInput,
          title: titleInput.trim() || undefined,
          reviewText: reviewTextInput.trim(),
        });

        if (res.isSuccess) {
          setReviewMsg({
            type: "success",
            text: "Your review was submitted successfully!",
          });
          setTimeout(() => {
            setShowReviewForm(false);
            setRatingInput(5);
            setTitleInput("");
            setReviewTextInput("");
          }, 1200);
          loadBookData(id);
          loadReviews(id, reviewPage, sortBy, ratingFilter, verifiedOnly);
        }
      }
    } catch (err: any) {
      setReviewMsg({
        type: "error",
        text: err.message || "Failed to submit review",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!id) return;
    try {
      const res = await deleteReviewBook({ reviewId });
      if (res.isSuccess) {
        setDeletingReviewId(null);
        loadBookData(id);
        loadReviews(id, reviewPage, sortBy, ratingFilter, verifiedOnly);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete review");
    }
  };

  const handleToggleHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      const res = await toggleHelpfulReview(reviewId);
      if (res.isSuccess && id) {
        // Optimistically update list
        setReviews((prev) =>
          prev.map((r) =>
            r._id === reviewId
              ? {
                  ...r,
                  helpfulCount: res.data.helpfulCount,
                  helpfulUsers: res.data.hasVotedHelpful
                    ? [...(r.helpfulUsers || []), userDetails.id]
                    : (r.helpfulUsers || []).filter(
                        (uid) => uid !== userDetails.id
                      ),
                }
              : r
          )
        );
      }
    } catch (err: any) {
      alert(err.message || "Unable to vote review as helpful");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReviewId || !reportReason.trim()) return;

    try {
      setSubmittingReport(true);
      const res = await reportReview(reportingReviewId, reportReason);
      if (res.isSuccess) {
        alert("Thank you. The review has been reported for moderation.");
        setReportingReviewId(null);
        setReportReason("");
      }
    } catch (err: any) {
      alert(err.message || "Failed to report review");
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppShell />
        <div className="flex-1 max-w-6xl mx-auto px-4 py-16 w-full animate-pulse space-y-8">
          <div className="h-6 w-32 bg-slate-800 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 h-96 bg-slate-900 rounded-2xl"></div>
            <div className="md:col-span-7 space-y-4">
              <div className="h-8 bg-slate-900 rounded w-3/4"></div>
              <div className="h-4 bg-slate-900 rounded w-1/2"></div>
              <div className="h-6 bg-slate-900 rounded w-1/4 mt-4"></div>
              <div className="h-24 bg-slate-900 rounded w-full mt-6"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppShell />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Book Not Found</h1>
          <p className="text-slate-400 max-w-md mb-6">
            {error || "The requested book could not be found in our catalog."}
          </p>
          <button
            onClick={() => navigate("/books")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition"
          >
            Back to Catalog
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const finalPrice =
    book.discountPercentage && book.discountPercentage > 0
      ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
      : book.price;

  const inStock = (book.stock ?? 10) > 0;
  const ratingValue = book.averageRating || reviewStats?.averageRating || 0;
  const totalReviewsCount =
    book.totalReviews !== undefined
      ? book.totalReviews
      : reviewStats?.totalReviews || reviews.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppShell />

      {/* Added to Cart Notification Toast */}
      {addedToCartToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">
            Added "{book.title}" to cart!
          </span>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-8">
          <Link to="/" className="hover:text-white transition">
            Home
          </Link>
          <span>/</span>
          <Link to="/books" className="hover:text-white transition">
            Books
          </Link>
          <span>/</span>
          <span className="text-slate-200 truncate max-w-xs">{book.title}</span>
        </nav>

        {/* Product Details Hero Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-xl">
          {/* Book Cover Visual Column */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group">
              <img
                src={
                  book.image ||
                  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80"
                }
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {book.discountPercentage && book.discountPercentage > 0 ? (
                <div className="absolute top-3 left-3 bg-rose-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg">
                  {book.discountPercentage}% OFF
                </div>
              ) : null}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWishlist();
                }}
                className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg backdrop-blur-md transition-all ${
                  wishlisted
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-900/90"
                }`}
                title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart
                  size={18}
                  fill={wishlisted ? "currentColor" : "none"}
                  className={wishlisted ? "text-white" : ""}
                />
              </button>
            </div>

            {/* Quick Guarantee Badges */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-6 text-center text-slate-400 text-[11px]">
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <Truck size={18} className="text-indigo-400 mb-1" />
                <span>Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <ShieldCheck size={18} className="text-emerald-400 mb-1" />
                <span>Original Copy</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <RotateCcw size={18} className="text-amber-400 mb-1" />
                <span>Easy Returns</span>
              </div>
            </div>
          </div>

          {/* Book Info Column */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              {/* Category Pill */}
              <div className="flex flex-wrap gap-2 mb-3">
                {book.genre?.split(",").map((g, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded-full text-xs font-semibold"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>

              {/* Title & Author */}
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
                {book.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-medium mb-4">
                by{" "}
                <Link
                  to={`/books?author=${encodeURIComponent(book.author)}`}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-400/40 hover:decoration-indigo-300 transition"
                >
                  {book.author}
                </Link>
              </p>

              {/* Ratings Summary Banner */}
              <div className="flex items-center gap-3 mb-6 bg-slate-950/50 border border-slate-800/80 p-3 rounded-2xl w-fit">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={18} fill="currentColor" />
                  <span className="font-bold text-white text-base">
                    {ratingValue.toFixed(1)}
                  </span>
                </div>
                <span className="text-slate-500">|</span>
                <a
                  href="#reviews-section"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                >
                  {totalReviewsCount} {totalReviewsCount === 1 ? "Review" : "Reviews"}
                </a>
              </div>

              {/* Pricing & Stock Banner */}
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-3xl sm:text-4xl font-black text-white">
                  NPR {finalPrice.toLocaleString()}
                </span>
                {book.discountPercentage && book.discountPercentage > 0 ? (
                  <>
                    <span className="text-lg text-slate-500 line-through">
                      NPR {book.price.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full">
                      Save NPR{" "}
                      {(book.price - finalPrice).toLocaleString()}
                    </span>
                  </>
                ) : null}

                <div className="ml-auto">
                  {inStock ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
                      <CheckCircle2 size={14} /> In Stock ({book.stock} left)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-full">
                      <AlertCircle size={14} /> Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Description Overview */}
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <BookOpen size={14} /> Overview
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {book.description ||
                    "No description provided for this title."}
                </p>
              </div>

              {/* Specifications Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-300 mb-6">
                {book.isbn ? (
                  <div>
                    <span className="text-slate-500 block font-medium">
                      ISBN
                    </span>
                    <span className="font-semibold text-slate-200">
                      {book.isbn}
                    </span>
                  </div>
                ) : null}
                {book.publisher ? (
                  <div>
                    <span className="text-slate-500 block font-medium">
                      Publisher
                    </span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Building size={12} /> {book.publisher}
                    </span>
                  </div>
                ) : null}
                {book.publicationDate ? (
                  <div>
                    <span className="text-slate-500 block font-medium">
                      Published
                    </span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Calendar size={12} /> {book.publicationDate}
                    </span>
                  </div>
                ) : null}
                {book.language ? (
                  <div>
                    <span className="text-slate-500 block font-medium">
                      Language
                    </span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Globe size={12} /> {book.language}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* CTA Controls */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {inStock && (
                  <div className="flex items-center border border-slate-700 bg-slate-900 rounded-xl px-2 py-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1 text-lg font-bold text-slate-400 hover:text-white transition"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold text-white text-base">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity((q) =>
                          Math.min(book.stock || 20, q + 1)
                        )
                      }
                      className="px-3 py-1 text-lg font-bold text-slate-400 hover:text-white transition"
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  disabled={!inStock}
                  onClick={() => handleAddToCart(false)}
                  className={`flex-1 w-full py-3 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                    inStock
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <ShoppingCart size={18} /> Add to Cart
                </button>

                <button
                  disabled={!inStock}
                  onClick={() => handleAddToCart(true)}
                  className={`flex-1 w-full py-3 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                    inStock
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Zap size={18} fill="currentColor" /> Buy Now
                </button>

                <button
                  onClick={handleToggleWishlist}
                  className={`p-3 rounded-xl border transition flex items-center justify-center ${
                    wishlisted
                      ? "bg-rose-600/20 border-rose-500 text-rose-400 hover:bg-rose-600/30"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
                  }`}
                  title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  <Heart size={20} fill={wishlisted ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PHASE 5: RATINGS & REVIEWS SECTION */}
        <section
          id="reviews-section"
          className="mt-16 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10"
        >
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Customer Reviews & Ratings
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {totalReviewsCount} Reviews
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Honest feedback from readers and verified purchasers
              </p>
            </div>

            <button
              onClick={() => handleOpenReviewForm()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              <MessageSquarePlus size={16} /> Write a Review
            </button>
          </div>

          {/* Rating Breakdown & Stats Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-8 pb-8 border-b border-slate-800">
            {/* Overall Score Box */}
            <div className="md:col-span-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-5xl font-black text-white mb-2">
                {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}
              </span>
              <div className="flex text-amber-400 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={20}
                    className={
                      ratingValue >= s
                        ? "fill-amber-400 text-amber-400"
                        : ratingValue >= s - 0.5
                        ? "fill-amber-400/50 text-amber-400"
                        : "text-slate-700"
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Based on {totalReviewsCount} customer ratings
              </p>
              {reviewStats?.verifiedReviewsCount ? (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <ShieldCheck size={13} /> {reviewStats.verifiedReviewsCount}{" "}
                  Verified Buyers
                </div>
              ) : null}
            </div>

            {/* 5-to-1 Star Distribution Breakdown */}
            <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const distItem =
                  reviewStats?.ratingDistribution?.[
                    stars as 1 | 2 | 3 | 4 | 5
                  ] || { count: 0, percentage: 0 };
                const isSelected = ratingFilter === stars;

                return (
                  <button
                    key={stars}
                    onClick={() => {
                      setRatingFilter(isSelected ? undefined : stars);
                      setReviewPage(1);
                    }}
                    className={`flex items-center gap-3 group text-left w-full p-1.5 rounded-lg transition ${
                      isSelected
                        ? "bg-indigo-950/60 ring-1 ring-indigo-500/50"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="w-12 text-xs font-semibold text-slate-300 flex items-center gap-1">
                      {stars} <Star size={12} className="fill-amber-400 text-amber-400" />
                    </span>

                    {/* Progress Bar */}
                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${distItem.percentage}%` }}
                      ></div>
                    </div>

                    <span className="w-12 text-right text-xs font-mono text-slate-400">
                      {distItem.percentage}%
                    </span>
                    <span className="w-8 text-right text-xs text-slate-500">
                      ({distItem.count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Review Modal / Form */}
          {showReviewForm && (
            <div className="mb-10 bg-slate-950 border border-indigo-500/40 p-6 sm:p-8 rounded-2xl shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-indigo-400" />
                  {editingReviewId ? "Edit Your Review" : "Write a Customer Review"}
                </h3>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {reviewMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold mb-4 ${
                    reviewMsg.type === "success"
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                      : "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                  }`}
                >
                  {reviewMsg.text}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          size={28}
                          className={
                            (hoverRating || ratingInput) >= star
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-700"
                          }
                        />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-amber-300 ml-3">
                      {ratingInput} of 5 Stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Headline / Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. Masterpiece of storytelling!"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Written Review *
                  </label>
                  <textarea
                    rows={4}
                    value={reviewTextInput}
                    onChange={(e) => setReviewTextInput(e.target.value)}
                    placeholder="What did you like or dislike about this book? Who would you recommend it to?"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg"
                  >
                    {submittingReview
                      ? "Submitting..."
                      : editingReviewId
                      ? "Update Review"
                      : "Submit Review"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtering & Sorting Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setRatingFilter(undefined);
                  setVerifiedOnly(false);
                  setReviewPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  ratingFilter === undefined && !verifiedOnly
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                All Reviews
              </button>

              <button
                onClick={() => {
                  setVerifiedOnly((prev) => !prev);
                  setReviewPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  verifiedOnly
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck size={13} /> Verified Purchases
              </button>

              {ratingFilter !== undefined && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {ratingFilter} Stars
                  <X
                    size={13}
                    className="cursor-pointer hover:text-white"
                    onClick={() => {
                      setRatingFilter(undefined);
                      setReviewPage(1);
                    }}
                  />
                </span>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <SlidersHorizontal size={13} /> Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setReviewPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating-high">Highest Rated</option>
                <option value="rating-low">Lowest Rated</option>
                <option value="most-helpful">Most Helpful</option>
              </select>
            </div>
          </div>

          {/* Reviews List Feed */}
          {loadingReviews ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-slate-950/60 rounded-2xl border border-slate-800"
                ></div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-slate-800/60">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-slate-300 font-bold mb-1">
                No reviews match your filters
              </h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
                Try clearing selected filters or be the first to share your thoughts on this book!
              </p>
              <button
                onClick={() => {
                  setRatingFilter(undefined);
                  setVerifiedOnly(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => {
                const authorId =
                  typeof rev.userId === "object" && rev.userId !== null
                    ? rev.userId._id
                    : rev.userId;
                const isMyReview =
                  isAuthenticated &&
                  Boolean(userDetails.id) &&
                  userDetails.id === authorId;
                const canModerate = isMyReview || isAdmin;
                const hasVotedHelpful =
                  isAuthenticated &&
                  Boolean(userDetails.id) &&
                  Boolean(rev.helpfulUsers?.includes(userDetails.id));

                return (
                  <div
                    key={rev._id}
                    className="bg-slate-950/70 border border-slate-800/80 p-5 sm:p-6 rounded-2xl transition hover:border-slate-700"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 border border-indigo-500/30 flex items-center justify-center text-white font-black text-xs shadow-inner">
                          {rev.username ? (
                            rev.username.substring(0, 2).toUpperCase()
                          ) : (
                            <User size={14} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {rev.username || "Anonymous Reader"}
                            </span>
                            {rev.isVerifiedPurchase && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                                <Check size={11} /> Verified Buyer
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {rev.createdAt
                              ? new Date(rev.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "Recent"}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex text-amber-400 gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={15}
                            className={
                              rev.rating >= s
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-700"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Title & Body */}
                    {rev.title && (
                      <h4 className="font-bold text-sm text-slate-100 mb-1">
                        {rev.title}
                      </h4>
                    )}
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line mb-4">
                      {rev.reviewText}
                    </p>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        {/* Helpful Button */}
                        <button
                          onClick={() => handleToggleHelpful(rev._id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                            hasVotedHelpful
                              ? "bg-indigo-950/80 text-indigo-300 border border-indigo-700"
                              : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <ThumbsUp size={13} className={hasVotedHelpful ? "fill-current" : ""} />
                          <span>Helpful ({rev.helpfulCount || 0})</span>
                        </button>

                        {/* Report Button */}
                        <button
                          onClick={() => {
                            if (!isAuthenticated) {
                              navigate("/login");
                              return;
                            }
                            setReportingReviewId(rev._id);
                          }}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Flag size={12} /> Report
                        </button>
                      </div>

                      {/* Edit / Delete for Owner / Admin */}
                      {canModerate && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenReviewForm(rev)}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-900 rounded-lg transition"
                            title="Edit Review"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingReviewId(rev._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                            title="Delete Review"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Review Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-800">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setReviewPage(p)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition ${
                      reviewPage === p
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                disabled={!pagination.hasNext}
                onClick={() => setReviewPage((p) => p + 1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

        {/* Report Review Modal */}
        {reportingReviewId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Flag size={16} className="text-rose-400" /> Report Inappropriate Review
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Please explain why this review violates community guidelines or is abusive.
              </p>
              <form onSubmit={handleReportSubmit}>
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason for reporting..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-4 resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportingReviewId(null);
                      setReportReason("");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition"
                  >
                    {submittingReport ? "Reporting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingReviewId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <Trash2 className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-2">Delete Review?</h3>
              <p className="text-xs text-slate-400 mb-6">
                Are you sure you want to permanently delete this review? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingReviewId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteReview(deletingReviewId)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Related Books Section */}
        {relatedBooks.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">More Books You Might Like</h2>
              <Link
                to="/books"
                className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
              >
                View All &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {relatedBooks.map((relBook) => {
                const relPrice =
                  relBook.discountPercentage && relBook.discountPercentage > 0
                    ? Number(
                        (
                          relBook.price *
                          (1 - relBook.discountPercentage / 100)
                        ).toFixed(2)
                      )
                    : relBook.price;

                return (
                  <Link
                    key={relBook._id}
                    to={`/books/${relBook._id}`}
                    className="group bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition duration-300"
                  >
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-slate-950">
                      <img
                        src={
                          relBook.image ||
                          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80"
                        }
                        alt={relBook.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {relBook.discountPercentage ? (
                        <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {relBook.discountPercentage}% OFF
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-indigo-400 transition">
                      {relBook.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">
                      by {relBook.author}
                    </p>
                    <div className="mt-auto flex items-baseline gap-2">
                      <span className="font-bold text-sm text-white">
                        NPR {relPrice.toLocaleString()}
                      </span>
                      {relBook.discountPercentage ? (
                        <span className="text-xs text-slate-500 line-through">
                          NPR {relBook.price.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <RecentlyViewed currentBookId={book?._id} className="mt-12 border-t border-slate-800 pt-8" />
      </main>

      <Footer />
    </div>
  );
}

export default BookDetailsPage;
