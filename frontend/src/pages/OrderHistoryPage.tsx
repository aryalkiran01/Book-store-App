import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { AppImage } from "../components/common/AppImage";
import { fetchMyOrders, cancelOrder, TOrder } from "../api/order/fetch";
import { addToCart } from "../utils/cartStorage";
import { useUserDetailsStore } from "../store/useUsersDetails";

const STATUS_FILTERS = [
  { label: "All Orders", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

export function OrderHistoryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserDetailsStore();

  const [orders, setOrders] = useState<TOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReasonModal, setCancelReasonModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadOrders();
  }, [isAuthenticated, statusFilter, page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMyOrders({
        page,
        limit: 10,
        status: statusFilter,
      });

      if (res.isSuccess) {
        setOrders(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setError(res.message || "Failed to load orders.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not load order history."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReasonModal) return;
    try {
      setCancellingId(cancelReasonModal);
      const res = await cancelOrder(cancelReasonModal, cancelReason.trim());
      if (res.isSuccess) {
        setToastMsg("Order cancelled successfully. Stock has been restored.");
        setTimeout(() => setToastMsg(null), 3000);
        setCancelReasonModal(null);
        setCancelReason("");
        loadOrders();
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
      setCancellingId(null);
    }
  };

  const handleBuyAgain = (order: TOrder) => {
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
    setToastMsg("Items from order added back to your cart!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1 rounded-full">
            <CheckCircle2 size={13} /> Delivered
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-3 py-1 rounded-full">
            <Truck size={13} /> Shipped
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-3 py-1 rounded-full">
            <Clock size={13} /> Processing
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-3 py-1 rounded-full">
            <CheckCircle2 size={13} /> Confirmed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 px-3 py-1 rounded-full">
            <XCircle size={13} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full">
            <Clock size={13} /> Pending
          </span>
        );
    }
  };

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <ShoppingBag className="text-indigo-600 dark:text-indigo-400" size={28} /> My Order History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track delivery progress, review past invoices, or re-order titles.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                statusFilter === f.value
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 animate-pulse h-40 shadow-sm"
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-3xl p-8 text-center max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Failed to load orders</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
            <button
              onClick={loadOrders}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm">
            <Package className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No orders found</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {statusFilter === "all"
                ? "You have not placed any orders yet."
                : `No orders in '${statusFilter}' status.`}
            </p>
            <Link
              to="/books"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-2"
            >
              Explore Bookstore
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const cancellable = ["pending", "confirmed", "processing"].includes(
                order.status
              );
              const orderDate = new Date(order.createdAt).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              );

              return (
                <div
                  key={order._id}
                  className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700/80 transition"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ORDER PLACED</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{orderDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[11px]">TOTAL AMOUNT</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          NPR {order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[11px]">ORDER ID</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{order._id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Body: Items Preview */}
                  <div className="py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {order.books.map((item, idx) => {
                      const bookObj = typeof item.bookId === "object" ? item.bookId : null;
                      const title = item.title || bookObj?.title || "Book Title";
                      const image = item.image || bookObj?.image;

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 p-3 rounded-2xl"
                        >
                          <div className="w-12 h-16 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
                            <AppImage
                              src={image}
                              alt={title}
                              fallbackType="book"
                              fallbackText={title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Qty: {item.quantity} &bull; NPR {item.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Payment: <span className="uppercase text-slate-700 dark:text-slate-300 font-mono">{order.paymentMethod}</span> &bull;{" "}
                      <span className="capitalize text-emerald-600 dark:text-emerald-400">{order.paymentStatus}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {cancellable && (
                        <button
                          onClick={() => setCancelReasonModal(order._id)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold rounded-xl transition"
                        >
                          Cancel Order
                        </button>
                      )}

                      <button
                        onClick={() => handleBuyAgain(order)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} /> Buy Again
                      </button>

                      <Link
                        to={`/orders/${order._id}`}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center gap-1 shadow-lg shadow-indigo-600/30"
                      >
                        View Details <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancelReasonModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <AlertCircle className="text-rose-500" size={20} /> Cancel Order
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Are you sure you want to cancel this order? All reserved inventory will be automatically returned to the bookstore catalog.
              </p>

              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Ordered by mistake, changed shipping address..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 mb-4 focus:outline-none focus:border-indigo-500 transition resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCancelReasonModal(null);
                    setCancelReason("");
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Keep Order
                </button>
                <button
                  disabled={Boolean(cancellingId)}
                  onClick={handleCancelOrder}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30 disabled:opacity-50"
                >
                  {cancellingId ? "Cancelling..." : "Confirm Cancellation"}
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

export default OrderHistoryPage;
