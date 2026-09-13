import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { AppImage } from "../components/common/AppImage";
import {
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  addToWishlist,
  CartItem,
} from "../utils/cartStorage";
import {
  validateCartApi,
  ValidatedCartSummary,
} from "../api/order/fetch";
import {
  ShoppingCart,
  Trash2,
  Heart,
  ArrowRight,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";

export function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<ValidatedCartSummary | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAndValidateCart();

    const handleStorageChange = () => {
      loadAndValidateCart();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cart-wishlist-update", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cart-wishlist-update", handleStorageChange);
    };
  }, []);

  const loadAndValidateCart = async () => {
    const rawCart = getCart();
    setCartItems(rawCart);

    if (rawCart.length === 0) {
      setSummary(null);
      return;
    }

    try {
      setLoadingValidation(true);
      const validationResult = await validateCartApi(
        rawCart.map((i) => ({ bookId: i._id, quantity: i.quantity }))
      );
      setSummary(validationResult);
    } catch (err) {
      console.error("Cart validation error:", err);
    } finally {
      setLoadingValidation(false);
    }
  };

  const handleQtyChange = (bookId: string, delta: number) => {
    const current = cartItems.find((i) => i._id === bookId);
    if (!current) return;
    const newQty = Math.max(1, current.quantity + delta);
    updateCartQuantity(bookId, newQty);
  };

  const handleRemove = (bookId: string, title: string) => {
    removeFromCart(bookId);
    showToast(`Removed "${title}" from cart`);
  };

  const handleMoveToWishlist = (item: CartItem) => {
    addToWishlist({
      _id: item._id,
      title: item.title,
      author: item.author,
      image: item.image,
      price: item.originalPrice || item.price,
      discountPercentage: item.discountPercentage,
      stock: item.stock,
    });
    removeFromCart(item._id);
    showToast(`Moved "${item.title}" to your Wishlist`);
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear your entire cart?")) {
      clearCart();
      showToast("Shopping cart cleared");
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fallback calculations if validation is loading
  const rawSubtotal =
    summary?.rawSubtotal ??
    cartItems.reduce(
      (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
      0
    );

  const subtotal =
    summary?.subtotal ??
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountSavings = summary?.discountSavings ?? rawSubtotal - subtotal;
  const shipping = summary?.shipping ?? (subtotal >= 1000 || subtotal === 0 ? 0 : 100);
  const finalTotal = summary?.finalTotal ?? subtotal + shipping;
  const freeShippingThreshold = 1000;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

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
                <ShoppingCart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                Shopping Cart
              </h1>
              {cartItems.length > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                  {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Review your items and proceed to secure checkout
            </p>
          </div>

          {cartItems.length > 0 && (
            <div className="flex items-center gap-3">
              <Link
                to="/books"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
              >
                + Add More Books
              </Link>
              <button
                onClick={handleClearCart}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 transition"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Empty Cart State */}
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm backdrop-blur-xl">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-6">
              <ShoppingBag size={42} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Your Shopping Cart is Empty
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-8">
              Explore our wide collection of bestselling books, fiction, technology, and regional literature.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/books"
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
              >
                Explore Book Catalog &rarr;
              </Link>
              <Link
                to="/wishlist"
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition shadow-sm"
              >
                View Your Wishlist
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {/* Free Shipping Notification Banner */}
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <Truck size={15} />
                    {subtotal >= freeShippingThreshold ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Congratulations! You have unlocked Free Delivery!
                      </span>
                    ) : (
                      <span>
                        Add{" "}
                        <strong className="text-slate-900 dark:text-white font-bold">
                          NPR {amountToFreeShipping.toLocaleString()}
                        </strong>{" "}
                        more to get Free Delivery!
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    NPR {subtotal.toLocaleString()} / NPR {freeShippingThreshold.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      subtotal >= freeShippingThreshold
                        ? "bg-emerald-500"
                        : "bg-indigo-600 dark:bg-indigo-500"
                    }`}
                    style={{ width: `${freeShippingProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Warnings Alert Box */}
              {summary && summary.warnings && summary.warnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                    <AlertTriangle size={15} /> Inventory Notice:
                  </div>
                  {summary.warnings.map((w, idx) => (
                    <p key={idx}>• {w}</p>
                  ))}
                </div>
              )}

              {/* Items Feed */}
              {cartItems.map((item) => {
                const validated = summary?.items?.find((i) => i.bookId === item._id);
                const itemEffectivePrice = validated ? validated.effectivePrice : item.price;
                const itemStock = validated ? validated.availableStock : item.stock ?? 20;
                const inStock = itemStock > 0;
                const itemTotal = itemEffectivePrice * item.quantity;

                return (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/90 rounded-2xl p-4 sm:p-5 transition shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-6 group"
                  >
                    {/* Thumbnail */}
                    <Link
                      to={`/books/${item._id}`}
                      className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 flex-shrink-0 border border-slate-200 dark:border-slate-800 relative group-hover:border-indigo-500/40 transition shadow-inner"
                    >
                      <AppImage
                        src={item.image}
                        alt={item.title}
                        fallbackType="book"
                        fallbackText={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </Link>

                    {/* Book Metadata */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <Link
                        to={`/books/${item._id}`}
                        className="font-bold text-base sm:text-lg text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition line-clamp-1"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                        by {item.author}
                      </p>

                      {/* Stock Indicator */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                        {inStock ? (
                          itemStock < 5 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                              <AlertCircle size={11} /> Only {itemStock} left in stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-md">
                              <CheckCircle2 size={11} /> In Stock
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md">
                            <AlertCircle size={11} /> Out of Stock
                          </span>
                        )}

                        {item.discountPercentage && item.discountPercentage > 0 ? (
                          <span className="text-[10px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-md">
                            {item.discountPercentage}% OFF
                          </span>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-semibold">
                        <button
                          onClick={() => handleMoveToWishlist(item)}
                          className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                        >
                          <Heart size={13} /> Save to Wishlist
                        </button>
                        <button
                          onClick={() => handleRemove(item._id, item.title)}
                          className="flex items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Quantity & Item Subtotal */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                      {/* Stepper */}
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl p-1">
                        <button
                          disabled={item.quantity <= 1}
                          onClick={() => handleQtyChange(item._id, -1)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          disabled={!inStock || item.quantity >= itemStock}
                          onClick={() => handleQtyChange(item._id, 1)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Price Matrix */}
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block">
                          NPR {itemTotal.toLocaleString()}
                        </span>
                        {item.discountPercentage && item.discountPercentage > 0 ? (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through">
                            NPR {((item.originalPrice || item.price) * item.quantity).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 dark:text-slate-500">
                            NPR {itemEffectivePrice.toLocaleString()} each
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Order Summary Card */}
            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl sticky top-24 backdrop-blur-xl shadow-xl space-y-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 text-sm">
                  {/* Raw Subtotal */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Items Subtotal</span>
                    <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold">
                      NPR {rawSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Discount Savings */}
                  {discountSavings > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Sparkles size={14} /> Discount Savings
                      </span>
                      <span className="font-mono font-bold">
                        - NPR {discountSavings.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Effective Subtotal */}
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span>Discounted Price</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      NPR {subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Shipping */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Truck size={14} /> Estimated Delivery
                    </span>
                    <span className="font-mono">
                      {shipping === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                          FREE
                        </span>
                      ) : (
                        `NPR ${shipping.toLocaleString()}`
                      )}
                    </span>
                  </div>

                  {/* Final Total */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-baseline justify-between">
                    <div>
                      <span className="text-base font-bold text-slate-900 dark:text-white block">
                        Total Amount
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Inclusive of all taxes
                      </span>
                    </div>
                    <span className="text-2xl font-black text-indigo-600 dark:text-white font-mono">
                      NPR {finalTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  disabled={loadingValidation || cartItems.length === 0}
                  onClick={() => navigate("/Checkout")}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-xl shadow-amber-500/20 active:scale-[0.98]"
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </button>

                {/* Security and Trust Badges */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5 text-slate-500 dark:text-slate-400 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500 dark:text-emerald-400" />
                    <span>Authoritative price & stock check verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span>7-day easy replacement policy</span>
                  </div>
                </div>

                {/* Supported Payment Logos */}
                <div className="pt-2 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2">
                    Supported Payment Gateways
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-[11px] rounded-lg border border-purple-200 dark:border-purple-800">
                      Khalti
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[11px] rounded-lg border border-emerald-200 dark:border-emerald-800">
                      eSewa
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg border border-slate-200 dark:border-slate-800">
                      Cash on Delivery
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CartPage;
