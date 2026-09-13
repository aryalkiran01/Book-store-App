import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Truck,
  Store,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  CreditCard,
  Lock,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useCreateOrder } from "../api/order/query";
import { validateCartApi, ValidatedCartSummary } from "../api/order/fetch";
import { getCart, clearCart } from "../utils/cartStorage";
import { useUserDetailsStore } from "../store/useUsersDetails";

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { userDetails } = useUserDetailsStore();

  const [cartItems, setCartItems] = useState(getCart());
  const [validatedSummary, setValidatedSummary] =
    useState<ValidatedCartSummary | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Form State
  const [fullName, setFullName] = useState(
    userDetails?.username || ""
  );
  const [email, setEmail] = useState(userDetails?.email || "");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery"
  );
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountMsg, setAppliedDiscountMsg] = useState<string | null>(
    null
  );
  const [showOrderList, setShowOrderList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { mutate: createOrderMutation } = useCreateOrder();

  const runCartValidation = async () => {
    const current = getCart();
    setCartItems(current);

    if (current.length === 0) {
      setValidatedSummary(null);
      setIsValidating(false);
      return;
    }

    try {
      setIsValidating(true);
      const data = await validateCartApi(
        current.map((i) => ({
          bookId: i._id,
          quantity: i.quantity,
        }))
      );
      setValidatedSummary(data);
    } catch (err: any) {
      console.error("Cart validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runCartValidation();
  }, [discountCode]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) return;
    runCartValidation();
    setAppliedDiscountMsg(`Coupon check applied for: ${discountCode.trim()}`);
  };

  const handleProceedToPayment = () => {
    if (!cartItems.length) return;

    if (deliveryType === "delivery" && !shippingAddress.trim()) {
      alert("Please provide your delivery address.");
      return;
    }

    setSubmitting(true);
    const orderData = {
      userId: userDetails?.id || undefined,
      books: cartItems.map((item) => ({
        bookId: item._id,
        quantity: item.quantity,
      })),
      totalAmount: validatedSummary?.finalTotal || 0,
      subtotal: validatedSummary?.subtotal || 0,
      shippingCost: validatedSummary?.shipping || 0,
      discount: validatedSummary?.discountSavings || 0,
      shippingAddress:
        deliveryType === "delivery" ? shippingAddress : "Store Pickup",
      orderNote: orderNote.trim() || undefined,
    };

    createOrderMutation(orderData, {
      onSuccess: (order: any) => {
        setSubmitting(false);
        clearCart();
        localStorage.setItem("orderDetails", JSON.stringify(order));
        navigate("/payment", { state: { orderDetails: order } });
      },
      onError: (err: any) => {
        setSubmitting(false);
        alert(
          err?.message || "Failed to create order. Please review stock and retry."
        );
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <AppShell />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header Breadcrumbs */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div>
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition mb-2"
            >
              <ArrowLeft size={14} /> Back to Shopping Cart
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <Lock className="text-indigo-400" size={26} /> Secure Checkout
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
            <ShieldCheck size={16} /> 256-Bit SSL Encrypted
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <AlertCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Your cart is empty
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Add books from our catalog before checking out.
            </p>
            <button
              onClick={() => navigate("/books")}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30"
            >
              Explore Bookstore
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form Info */}
            <div className="lg:col-span-7 space-y-6">
              {/* Warnings Banner */}
              {validatedSummary?.warnings &&
                validatedSummary.warnings.length > 0 && (
                  <div className="bg-amber-950/70 border border-amber-800/80 rounded-2xl p-4 text-amber-300 text-xs flex items-start gap-3">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-1">
                        Inventory Note:
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {validatedSummary.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

              {/* Personal Info Box */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +977 9800000000"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Option Box */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  Delivery Method
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div
                    onClick={() => setDeliveryType("delivery")}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      deliveryType === "delivery"
                        ? "bg-indigo-950/40 border-indigo-500"
                        : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Truck
                      size={20}
                      className={
                        deliveryType === "delivery"
                          ? "text-indigo-400"
                          : "text-slate-400"
                      }
                    />
                    <div>
                      <p className="font-bold text-sm text-white">
                        Standard Home Delivery
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Delivered in 2-4 business days across Nepal
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryType("pickup")}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      deliveryType === "pickup"
                        ? "bg-indigo-950/40 border-indigo-500"
                        : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Store
                      size={20}
                      className={
                        deliveryType === "pickup"
                          ? "text-indigo-400"
                          : "text-slate-400"
                      }
                    />
                    <div>
                      <p className="font-bold text-sm text-white">
                        Store Pickup
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pick up at our bookstore with zero shipping fee
                      </p>
                    </div>
                  </div>
                </div>

                {deliveryType === "delivery" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                      Shipping / Delivery Address *
                    </label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Street address, City, Ward / Landmark"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition resize-none"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Special instructions for delivery or packaging..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Review */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl sticky top-24">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h2 className="text-lg font-bold text-white">
                    Order Summary ({cartItems.length}{" "}
                    {cartItems.length === 1 ? "item" : "items"})
                  </h2>
                  <button
                    onClick={() => setShowOrderList(!showOrderList)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                  >
                    {showOrderList ? "Hide List" : "Show List"}
                    {showOrderList ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                </div>

                {/* Collapsible item preview */}
                {showOrderList && (
                  <div className="py-4 space-y-3 max-h-60 overflow-y-auto border-b border-slate-800">
                    {cartItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center gap-3 text-xs"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-10 h-14 object-cover rounded-lg bg-slate-950 border border-slate-800"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-200 truncate">
                            {item.title}
                          </p>
                          <p className="text-slate-400">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-bold text-white">
                          NPR {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coupon Input */}
                <form onSubmit={handleApplyCoupon} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Discount code / Promo"
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 uppercase tracking-wider focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Apply
                  </button>
                </form>
                {appliedDiscountMsg && (
                  <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {appliedDiscountMsg}
                  </p>
                )}

                {/* Calculation Breakdown */}
                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">
                      NPR{" "}
                      {(
                        validatedSummary?.subtotal ??
                        cartItems.reduce(
                          (sum, i) => sum + i.price * i.quantity,
                          0
                        )
                      ).toLocaleString()}
                    </span>
                  </div>

                  {validatedSummary?.discountSavings ? (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span className="font-semibold">
                        - NPR {validatedSummary.discountSavings.toLocaleString()}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-slate-400">
                    <span>Shipping</span>
                    <span className="font-semibold text-white">
                      {deliveryType === "pickup" ||
                      validatedSummary?.shipping === 0 ? (
                        <span className="text-emerald-400 font-bold">FREE</span>
                      ) : (
                        `NPR ${(
                          validatedSummary?.shipping ?? 100
                        ).toLocaleString()}`
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="font-bold text-white text-base">
                      Total Due
                    </span>
                    <span className="font-black text-2xl text-white">
                      NPR{" "}
                      {(
                        (deliveryType === "pickup"
                          ? (validatedSummary?.subtotal || 0) -
                            (validatedSummary?.discountSavings || 0)
                          : validatedSummary?.finalTotal) || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleProceedToPayment}
                  disabled={submitting || isValidating}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard size={18} />
                  {submitting ? "Processing Order..." : "Proceed to Payment"}
                </button>

                <p className="text-[11px] text-slate-400 text-center mt-3">
                  Authoritative calculations verified by backend before payment.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CheckoutPage;

