import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  Copy,
  Check,
  CreditCard,
  MapPin,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { AppImage } from "../components/common/AppImage";

export function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (location.state?.order) {
      setOrder(location.state.order);
    } else {
      const stored = localStorage.getItem("orderDetails");
      if (stored) {
        try {
          setOrder(JSON.parse(stored));
        } catch {
          navigate("/books");
        }
      } else {
        navigate("/books");
      }
    }
  }, [location.state, navigate]);

  if (!order) {
    return null;
  }

  const orderId = order._id || order.orderId || "N/A";
  const books = order.books || [];
  const address =
    typeof order.shippingAddress === "string"
      ? order.shippingAddress
      : order.shippingAddress?.street ||
        order.shippingAddress?.city ||
        "Standard Delivery Address";

  const handleCopyId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppShell />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Success Header Box */}
        <div className="text-center bg-white dark:bg-gradient-to-b dark:from-slate-900/80 dark:to-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm dark:shadow-2xl backdrop-blur-xl mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400 animate-pulse">
            <CheckCircle2 size={44} />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Thank You for Your Order!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
            Your order has been placed successfully and is now being prepared by
            our team.
          </p>

          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500">Order ID:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{orderId}</span>
            <button
              onClick={handleCopyId}
              className="p-1 hover:text-slate-900 dark:hover:text-white text-slate-400 transition ml-1"
              title="Copy Order ID"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Order Details & Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Items & Shipping Column */}
          <div className="md:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package size={18} className="text-indigo-600 dark:text-indigo-400" /> Ordered Books ({books.length})
              </h2>

              <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                {books.map((item: any, idx: number) => {
                  const bookInfo = typeof item.bookId === "object" ? item.bookId : null;
                  const title = item.title || bookInfo?.title || "Book Title";
                  const image = item.image || bookInfo?.image;
                  const price = item.price || 0;
                  const qty = item.quantity || 1;

                  return (
                    <div key={idx} className="pt-3 first:pt-0 flex items-center gap-3">
                      <div className="w-12 h-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden flex-shrink-0">
                        <AppImage
                          src={image}
                          alt={title}
                          fallbackType="book"
                          fallbackText={title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Qty: {qty} &times; NPR {price.toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        NPR {(price * qty).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery & Payment Info */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm backdrop-blur-xl text-xs space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Delivery Address</span>
                  <p className="text-slate-500 dark:text-slate-400">{address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Payment Method</span>
                  <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    {order.paymentMethod || "Khalti"} &bull;{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 capitalize">
                      {order.paymentStatus || "Completed"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Invoice & Actions */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
                Payment Breakdown
              </h2>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    NPR {(order.subtotal || order.totalAmount || 0).toLocaleString()}
                  </span>
                </div>

                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-semibold">- NPR {order.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Delivery</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.shippingCost === 0 ? "FREE" : `NPR ${order.shippingCost}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-slate-900 dark:text-white">Total Paid</span>
                  <span className="font-black text-lg text-indigo-600 dark:text-white">
                    NPR {(order.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-4">
                <Link
                  to={`/orders/${orderId}`}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <Package size={14} /> View Order & Tracking Details
                </Link>

                <Link
                  to="/orders"
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={14} /> My Order History
                </Link>

                <Link
                  to="/books"
                  className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition flex items-center justify-center gap-1"
                >
                  Continue Shopping <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default OrderSuccessPage;
