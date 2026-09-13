import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getBookById, getAllBooks, TBook } from "../api/book/fetch";
import { addReview, TReview } from "../api/review/fetch";
import { useUserDetailsStore } from "../store/useUsersDetails";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import {
  Star,
  ShoppingCart,
  Zap,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  User,
  Heart,
  Calendar,
  Globe,
  Building,
} from "lucide-react";

export function BookDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserDetailsStore();

  const [book, setBook] = useState<TBook | null>(null);
  const [reviews, setReviews] = useState<TReview[]>([]);
  const [relatedBooks, setRelatedBooks] = useState<TBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  // Review Form states
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTextInput, setReviewTextInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    loadBookData(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  const loadBookData = async (bookId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBookById({ bookId });

      if (res.isSuccess && res.data) {
        const bookObj = res.data.result || res.data;
        const reviewList = res.data.review || res.data.reviews || [];
        setBook(bookObj);
        setReviews(reviewList);

        // Fetch related books by genre
        if (bookObj.genre) {
          const primaryGenre = bookObj.genre.split(",")[0].trim();
          const relatedRes = await getAllBooks({ genre: primaryGenre, limit: 4 });
          if (relatedRes.isSuccess && relatedRes.data) {
            setRelatedBooks(relatedRes.data.filter((b) => b._id !== bookObj._id));
          }
        }
      } else {
        setError(res.message || "Book details not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load book details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (redirectCheckout = false) => {
    if (!book) return;
    const effectivePrice =
      book.discountPercentage && book.discountPercentage > 0
        ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
        : book.price;

    const savedCart = localStorage.getItem("cart");
    const cart = savedCart ? JSON.parse(savedCart) : [];

    const existingIndex = cart.findIndex((item: any) => item._id === book._id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + quantity;
    } else {
      cart.push({
        _id: book._id,
        title: book.title,
        author: book.author,
        price: effectivePrice,
        originalPrice: book.price,
        image: book.image,
        quantity: quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));

    if (redirectCheckout) {
      navigate("/Checkout");
    } else {
      setAddedToCartToast(true);
      setTimeout(() => setAddedToCartToast(false), 3000);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !book) return;

    if (!isAuthenticated) {
      setReviewMsg({
        type: "error",
        text: "Please sign in to write a review.",
      });
      return;
    }

    if (!reviewTextInput.trim()) {
      setReviewMsg({
        type: "error",
        text: "Review content cannot be empty.",
      });
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewMsg(null);
      const res = await addReview({
        bookId: id,
        rating: ratingInput,
        reviewText: reviewTextInput.trim(),
      });

      if (res.isSuccess) {
        setReviewMsg({
          type: "success",
          text: "Your review was submitted successfully!",
        });
        setReviewTextInput("");
        // Refresh book and reviews data
        loadBookData(id);
      } else {
        setReviewMsg({
          type: "error",
          text: res.message || "Failed to post review",
        });
      }
    } catch (err: any) {
      setReviewMsg({
        type: "error",
        text: err.message || "An error occurred while submitting review",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AppShell />
        <div className="flex-1 max-w-6xl mx-auto px-4 py-16 w-full animate-pulse space-y-8">
          <div className="h-6 w-32 bg-slate-800 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-5 h-[480px] bg-slate-800 rounded-2xl"></div>
            <div className="md:col-span-7 space-y-4">
              <div className="h-8 w-3/4 bg-slate-800 rounded"></div>
              <div className="h-5 w-1/2 bg-slate-800 rounded"></div>
              <div className="h-10 w-1/3 bg-slate-800 rounded mt-6"></div>
              <div className="h-24 w-full bg-slate-800 rounded"></div>
              <div className="h-12 w-1/2 bg-slate-800 rounded"></div>
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
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold mb-2">Book Not Found</h2>
          <p className="text-slate-400 max-w-md mb-6">{error || "The book you are looking for does not exist or has been removed."}</p>
          <Link
            to="/books"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition"
          >
            <ArrowLeft size={18} /> Back to Catalog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const effectivePrice =
    book.discountPercentage && book.discountPercentage > 0
      ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
      : book.price;

  const inStock = (book.stock ?? 20) > 0;
  const isLowStock = inStock && (book.stock ?? 20) <= 5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppShell />

      {/* Toast Notification */}
      {addedToCartToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 size={20} />
          <span className="font-medium">Added to your shopping cart!</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link to="/" className="hover:text-indigo-400 transition">Home</Link>
          <span>/</span>
          <Link to="/books" className="hover:text-indigo-400 transition">Catalog</Link>
          <span>/</span>
          <span className="text-slate-200 truncate max-w-xs">{book.title}</span>
        </div>

        {/* Product Presentation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Cover & Gallery Column */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900 group">
              <img
                src={book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80"}
                alt={book.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              {book.discountPercentage ? (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>{book.discountPercentage}% OFF</span>
                </div>
              ) : null}

              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                aria-label="Add to wishlist"
                className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition ${
                  isWishlisted
                    ? "bg-rose-500 text-white shadow-lg"
                    : "bg-black/50 text-slate-300 hover:text-white hover:bg-black/70"
                }`}
              >
                <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Guarantees Box */}
            <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm text-center">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <Truck className="w-5 h-5 mx-auto text-indigo-400 mb-1" />
                <span className="text-[11px] text-slate-300 font-medium block">Fast Delivery</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <ShieldCheck className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                <span className="text-[11px] text-slate-300 font-medium block">100% Genuine</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <RotateCcw className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                <span className="text-[11px] text-slate-300 font-medium block">Easy Return</span>
              </div>
            </div>
          </div>

          {/* Details & Purchase Column */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              {/* Category Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {book.genre?.split(",").map((g, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-semibold rounded-full"
                  >
                    {g.trim()}
                  </span>
                ))}
                {book.featured && (
                  <span className="px-3 py-1 bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Sparkles size={11} /> Featured
                  </span>
                )}
                {book.isNewArrival && (
                  <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-semibold rounded-full">
                    New Arrival
                  </span>
                )}
              </div>

              {/* Title & Author */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
                {book.title}
              </h1>
              <p className="text-lg text-slate-300 mb-4">
                by <span className="font-semibold text-indigo-300">{book.author}</span>
              </p>

              {/* Rating Summary */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={
                        (book.averageRating || 0) >= star
                          ? "fill-amber-400 text-amber-400"
                          : (book.averageRating || 0) >= star - 0.5
                          ? "fill-amber-400/50 text-amber-400"
                          : "text-slate-600"
                      }
                    />
                  ))}
                </div>
                <span className="font-bold text-white text-base">
                  {book.averageRating ? book.averageRating.toFixed(1) : "0.0"}
                </span>
                <span className="text-slate-400 text-sm">
                  ({book.totalReviews || reviews.length} customer {book.totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>

              {/* Pricing Display */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl mb-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-white tracking-tight">
                    NPR {effectivePrice.toLocaleString()}
                  </span>
                  {book.discountPercentage ? (
                    <>
                      <span className="text-xl text-slate-400 line-through">
                        NPR {book.price.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
                        Save NPR {(book.price - effectivePrice).toLocaleString()}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Stock Status Indicator */}
                <div className="mt-3 flex items-center gap-2">
                  {inStock ? (
                    isLowStock ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        Only {book.stock} copies left in stock — order soon!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 size={14} /> In Stock ({book.stock} available)
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <AlertCircle size={14} /> Currently Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                  <BookOpen size={16} /> Overview
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {book.description || "No description provided for this title."}
                </p>
              </div>

              {/* Metadata Attributes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs text-slate-300 mb-6">
                {book.isbn ? (
                  <div>
                    <span className="text-slate-500 block font-medium">ISBN</span>
                    <span className="font-semibold text-slate-200">{book.isbn}</span>
                  </div>
                ) : null}
                {book.publisher ? (
                  <div>
                    <span className="text-slate-500 block font-medium">Publisher</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Building size={12} /> {book.publisher}
                    </span>
                  </div>
                ) : null}
                {book.publicationDate ? (
                  <div>
                    <span className="text-slate-500 block font-medium">Published</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Calendar size={12} /> {book.publicationDate}
                    </span>
                  </div>
                ) : null}
                {book.language ? (
                  <div>
                    <span className="text-slate-500 block font-medium">Language</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Globe size={12} /> {book.language}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Quantity Control */}
                {inStock && (
                  <div className="flex items-center border border-slate-700 bg-slate-900 rounded-xl px-2 py-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1 text-lg font-bold text-slate-400 hover:text-white transition"
                    >
                      -
                    </button>
                    <span className="px-4 font-bold text-white text-base">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(book.stock || 20, q + 1))}
                      className="px-3 py-1 text-lg font-bold text-slate-400 hover:text-white transition"
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Primary CTA Buttons */}
                <button
                  disabled={!inStock}
                  onClick={() => handleAddToCart(false)}
                  className={`flex-1 w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
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
                  className={`flex-1 w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                    inStock
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold active:scale-[0.98]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Zap size={18} fill="currentColor" /> Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews & Feedback Section */}
        <section className="mt-16 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white">Ratings & Customer Reviews</h2>
              <p className="text-slate-400 text-sm mt-1">Real feedback from verified book enthusiasts</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-white">
                {book.averageRating ? book.averageRating.toFixed(1) : "0.0"}
              </span>
              <div>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={(book.averageRating || 0) >= s ? "fill-amber-400" : "text-slate-700"}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{reviews.length} total reviews</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Write a Review Form */}
            <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Write Your Review</h3>
              <p className="text-slate-400 text-xs mb-5">Share your thoughts with other readers</p>

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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rating Score</label>
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
                          size={24}
                          className={
                            (hoverRating || ratingInput) >= star
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-700"
                          }
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-300 ml-2">
                      {ratingInput} out of 5 stars
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Review</label>
                  <textarea
                    rows={4}
                    value={reviewTextInput}
                    onChange={(e) => setReviewTextInput(e.target.value)}
                    placeholder="What did you love or learn from this book?"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-sm transition"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            </div>

            {/* Existing Reviews Feed */}
            <div className="lg:col-span-7 space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-slate-300 font-semibold mb-1">No reviews yet</h4>
                  <p className="text-slate-500 text-xs">Be the very first reader to review this book!</p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="bg-slate-950/50 border border-slate-800/80 p-5 rounded-2xl transition hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-300 font-bold text-xs">
                          {rev.username ? rev.username.substring(0, 2).toUpperCase() : <User size={14} />}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-white block">
                            {rev.username || "Reader"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : "Recent review"}
                          </span>
                        </div>
                      </div>

                      <div className="flex text-amber-400 gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={rev.rating >= s ? "fill-amber-400 text-amber-400" : "text-slate-700"}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed pl-12">
                      {rev.reviewText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Related Books Section */}
        {relatedBooks.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">More Books You Might Like</h2>
              <Link to="/books" className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">
                View All &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {relatedBooks.map((relBook) => {
                const relPrice =
                  relBook.discountPercentage && relBook.discountPercentage > 0
                    ? Number((relBook.price * (1 - relBook.discountPercentage / 100)).toFixed(2))
                    : relBook.price;

                return (
                  <Link
                    key={relBook._id}
                    to={`/books/${relBook._id}`}
                    className="group bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition duration-300"
                  >
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-slate-950">
                      <img
                        src={relBook.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80"}
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
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">by {relBook.author}</p>
                    <div className="mt-auto flex items-baseline gap-2">
                      <span className="font-bold text-sm text-white">NPR {relPrice.toLocaleString()}</span>
                      {relBook.discountPercentage ? (
                        <span className="text-xs text-slate-500 line-through">NPR {relBook.price.toLocaleString()}</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default BookDetailsPage;
