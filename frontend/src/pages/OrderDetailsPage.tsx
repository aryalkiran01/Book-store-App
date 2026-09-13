import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
  ArrowLeft,
  MapPin,
  RotateCcw,
  Calendar,
  FileText,
  Loader2,
  Check,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { AppImage } from "../components/common/AppImage";
import { fetchOrderById, cancelOrder, TOrder } from "../api/order/fetch";
import { addToCart } from "../utils/cartStorage";
import { useUserDetailsStore } from "../store/useUsersDetails";

const TIMELINE_STEPS = [
  { key: "pending", label: "Order Placed", desc: "Order details received" },
  { key: "confirmed", label: "Confirmed", desc: "Payment/Order verified" },
  { key: "processing", label: "Processing", desc: "Books packaged & prepared" },
  { key: "shipped", label: "Shipped", desc: "Dispatched with courier" },
  { key: "delivered", label: "Delivered", desc: "Package received safely" },
];

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserDetailsStore();

  const [order, setOrder] = useState<TOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (orderId) {
      loadOrder(orderId);
    }
  }, [isAuthenticated, orderId]);

  const loadOrder = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOrderById(id);
      if (res.isSuccess && res.data) {
        setOrder(res.data);
      } else {
        setError(res.message || "Order not found.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not retrieve order details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      const res = await cancelOrder(order._id, cancelReason.trim());
      if (res.isSuccess) {
        setToastMsg("Order cancelled successfully. Inventory restored.");
        setTimeout(() => setToastMsg(null), 3000);
        setCancelModal(false);
        setCancelReason("");
        loadOrder(order._id);
      } else {
        alert(res.message || "Failed to cancel order.");
      }
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Error cancelling order."
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleBuyAgain = () => {
    if (!order) return;
    for (const item of order.books) {
      const bookObj = typeof item.bookId === "object" ? item.bookId : null;
      addToCart(
        {
          _id: bookObj?._id || (item.bookId as string),
          title: item.title || bookObj?.title || "Book",
          author: bookObj?.author || "",
          price: item.price,
          image: item.image || bookObj?.image,
        },
        item.quantity
      );
    }
    setToastMsg("Items added back to your cart!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "confirmed":
        return 1;
      case "processing":
        return 2;
      case "shipped":
        return 3;
      case "delivered":
        return 4;
      default:
        return -1;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
        <AppShell />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading order information...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
        <AppShell />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{error || "Could not load this order."}</p>
          <Link
            to="/orders"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition"
          >
            Back to Orders
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const isRefunded = order.status === "refunded";
  const cancellable = ["pending", "confirmed", "processing"].includes(order.status);

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const address =
    typeof order.shippingAddress === "string"
      ? order.shippingAddress
      : order.shippingAddress?.street ||
        order.shippingAddress?.city ||
        "Standard Delivery Address";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppShell />

      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">{toastMsg}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition mb-2"
            >
              <ArrowLeft size={14} /> Back to My Orders
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Order #{order._id.substring(order._id.length - 8).toUpperCase()}
              </h1>
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">({order._id})</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <Calendar size={13} /> Placed on {formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {cancellable && (
              <button
                onClick={() => setCancelModal(true)}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs transition"
              >
                Cancel Order
              </button>
            )}
            <button
              onClick={handleBuyAgain}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw size={13} /> Buy Again
            </button>
          </div>
        </div>

        {/* Status Alert Banner if Cancelled or Refunded */}
        {isCancelled && (
          <div className="mb-8 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-3xl p-6 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-4 shadow-sm">
            <XCircle size={24} className="shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">This order was cancelled</h3>
              <p className="text-rose-700/80 dark:text-rose-200/80">
                Reason: {order.cancellationReason || "Cancelled by customer request"}. Reserved inventory has been automatically returned to the bookstore.
              </p>
            </div>
          </div>
        )}

        {isRefunded && (
          <div className="mb-8 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 rounded-3xl p-6 text-purple-700 dark:text-purple-300 text-xs flex items-start gap-4 shadow-sm">
            <RotateCcw size={24} className="shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Order Refunded</h3>
              <p className="text-purple-700/80 dark:text-purple-200/80">
                The transaction amount of NPR {order.totalAmount.toLocaleString()} has been processed for refund.
              </p>
            </div>
          </div>
        )}

        {/* Tracking Stepper Progress Bar (Only if active) */}
        {!isCancelled && !isRefunded && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl mb-8">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Truck size={16} className="text-indigo-600 dark:text-indigo-400" /> Order Tracking Lifecycle
            </h2>

            <div className="grid grid-cols-5 gap-2 relative">
              {/* Progress Line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-indigo-600 dark:bg-indigo-500 -z-0 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (currentStep / 4) * 100))}%`,
                }}
              />

              {TIMELINE_STEPS.map((step, idx) => {
                const isPassed = currentStep >= idx;
                const isCurrent = currentStep === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-600/30 scale-110"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check size={14} /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-bold mt-3 block ${
                        isCurrent
                          ? "text-indigo-600 dark:text-indigo-400"
                          : isPassed
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:block mt-0.5">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Book Items & History */}
          <div className="lg:col-span-8 space-y-6">
            {/* Items List */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package size={18} className="text-indigo-600 dark:text-indigo-400" /> Items in this Order ({order.books.length})
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {order.books.map((item, idx) => {
                  const bookObj = typeof item.bookId === "object" ? item.bookId : null;
                  const bookId = bookObj?._id || (item.bookId as string);
                  const title = item.title || bookObj?.title || "Book Title";
                  const image = item.image || bookObj?.image;

                  return (
                    <div key={idx} className="py-4 first:pt-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shrink-0">
                          <AppImage
                            src={image}
                            alt={title}
                            fallbackType="book"
                            fallbackText={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/books/${bookId}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate block"
                          >
                            {title}
                          </Link>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Unit Price: NPR {item.price.toLocaleString()}
                          </p>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 dark:text-white block">
                          NPR {(item.price * item.quantity).toLocaleString()}
                        </span>
                        <Link
                          to={`/books/${bookId}`}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block"
                        >
                          Write Review &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status History Timeline Log */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm backdrop-blur-xl">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600 dark:text-indigo-400" /> Order Activity Log
                </h2>

                <div className="space-y-3">
                  {order.statusHistory.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 text-xs border-l-2 border-indigo-500/40 pl-3 py-1"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {h.status}
                        </span>
                        {h.note && <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{h.note}</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                        {new Date(h.changedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Invoice & Delivery Address */}
          <div className="lg:col-span-4 space-y-6">
            {/* Financial Summary */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800">
                Payment Summary
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
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.shippingCost === 0 ? "FREE" : `NPR ${order.shippingCost}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-slate-900 dark:text-white">Total Amount</span>
                  <span className="font-black text-xl text-indigo-600 dark:text-white">
                    NPR {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="uppercase text-slate-800 dark:text-slate-200 font-mono">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className="capitalize font-bold text-emerald-600 dark:text-emerald-400">{order.paymentStatus}</span>
                </div>
                {order.paymentId && (
                  <div className="flex justify-between">
                    <span>Transaction Ref:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{order.paymentId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping / Delivery Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm backdrop-blur-xl text-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <MapPin size={16} /> Delivery Information
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium">{address}</p>
              {order.orderNote && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500 block">Order Note:</span>
                  {order.orderNote}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation Modal */}
        {cancelModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <AlertCircle className="text-rose-500" size={20} /> Cancel Order
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Please confirm if you want to cancel this order. Reserved books will be immediately restored to stock.
              </p>

              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tell us why you are cancelling..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 mb-4 focus:outline-none focus:border-indigo-500 transition resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setCancelModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Keep Order
                </button>
                <button
                  disabled={cancelling}
                  onClick={handleCancelOrder}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default OrderDetailsPage;
