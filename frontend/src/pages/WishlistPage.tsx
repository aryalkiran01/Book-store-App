import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { AppImage } from "../components/common/AppImage";
import {
  getWishlist,
  removeFromWishlist,
  moveWishlistToCart,
  addToCart,
  WishlistItem,
} from "../utils/cartStorage";
import {
  Heart,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();

    const handleStorageChange = () => {
      loadWishlist();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cart-wishlist-update", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cart-wishlist-update", handleStorageChange);
    };
  }, []);

  const loadWishlist = () => {
    setWishlistItems(getWishlist());
  };

  const handleMoveToCart = (item: WishlistItem) => {
    moveWishlistToCart({
      _id: item._id,
      title: item.title,
      author: item.author,
      image: item.image,
      price: item.price,
      discountPercentage: item.discountPercentage,
      stock: item.stock,
    });
    showToast(`Moved "${item.title}" to cart`);
  };

  const handleAddAllToCart = () => {
    wishlistItems.forEach((item) => {
      addToCart({
        _id: item._id,
        title: item.title,
        author: item.author,
        image: item.image,
        price: item.price,
        discountPercentage: item.discountPercentage,
        stock: item.stock,
      });
    });
    showToast(`Added all ${wishlistItems.length} items to cart!`);
  };

  const handleRemove = (bookId: string, title: string) => {
    removeFromWishlist(bookId);
    showToast(`Removed "${title}" from wishlist`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppShell />

      {/* Floating Action Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-white dark:bg-slate-900 border border-indigo-500 text-slate-900 dark:text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                <Heart className="w-8 h-8 text-rose-500 fill-rose-500/20" />
                My Saved Wishlist
              </h1>
              {wishlistItems.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {wishlistItems.length} {wishlistItems.length === 1 ? "book" : "books"}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Keep track of books you love and move them to cart whenever you are ready
            </p>
          </div>

          {wishlistItems.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddAllToCart}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
              >
                <ShoppingCart size={15} /> Add All to Cart
              </button>
            </div>
          )}
        </div>

        {/* Empty Wishlist State */}
        {wishlistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm backdrop-blur-xl">
            <div className="w-24 h-24 rounded-full bg-rose-50 dark:bg-slate-900 border border-rose-100 dark:border-slate-800 flex items-center justify-center text-rose-500 mb-6">
              <Heart size={42} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-8">
              Explore our collection and click the heart icon on any book to save it for later.
            </p>
            <Link
              to="/books"
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
            >
              Discover Books in Catalog &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistItems.map((item) => {
              const inStock = (item.stock ?? 10) > 0;
              const effectivePrice =
                item.discountPercentage && item.discountPercentage > 0
                  ? Number(
                      (item.price * (1 - item.discountPercentage / 100)).toFixed(2)
                    )
                  : item.price;

              return (
                <div
                  key={item._id}
                  className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 relative"
                >
                  {/* Image and badges */}
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <AppImage
                      src={item.image}
                      isbn={item.isbn}
                      coverId={item.coverId}
                      openLibraryId={item.openLibraryId}
                      author={item.author}
                      genre={item.genre}
                      alt={item.title}
                      fallbackType="book"
                      fallbackTitle={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {item.discountPercentage && item.discountPercentage > 0 ? (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        {item.discountPercentage}% OFF
                      </span>
                    ) : null}

                    <button
                      onClick={() => handleRemove(item._id, item.title)}
                      aria-label={`Remove ${item.title} from wishlist`}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-slate-950/80 hover:bg-rose-600 text-slate-600 dark:text-slate-400 hover:text-white transition shadow backdrop-blur-md focus-ring btn-press"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 mb-4">
                    {item.genre && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                        {item.genre.split(",")[0]}
                      </span>
                    )}

                    <Link
                      to={`/books/${item._id}`}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition line-clamp-1 block focus-ring rounded"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 mb-2">
                      by {item.author}
                    </p>

                    {/* Stock Status */}
                    <div className="mb-2">
                      {inStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={11} /> In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertCircle size={11} /> Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white font-mono">
                        NPR {effectivePrice.toLocaleString()}
                      </span>
                      {item.discountPercentage && item.discountPercentage > 0 ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500 line-through">
                          NPR {item.price.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Move to Cart CTA */}
                  <button
                    disabled={!inStock}
                    onClick={() => handleMoveToCart(item)}
                    aria-label={`Move ${item.title} to Cart`}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition focus-ring btn-press ${
                      inStock
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <ShoppingCart size={14} /> Move to Cart
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default WishlistPage;
