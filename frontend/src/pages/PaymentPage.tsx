import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CreditCard,
  Truck,
  Zap,
  ArrowLeft,
  Lock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { clearCart } from "../utils/cartStorage";
import { initiatePayment, verifyPayment } from "../api/payment/fetch";
import { useUserDetailsStore } from "../store/useUsersDetails";

export function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails } = useUserDetailsStore();

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<
    "khalti" | "cod" | "demo"
  >("khalti");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check state from checkout navigation
    if (location.state?.orderDetails) {
      setOrderDetails(location.state.orderDetails);
      localStorage.setItem(
        "orderDetails",
        JSON.stringify(location.state.orderDetails)
      );
    } else {
      const stored = localStorage.getItem("orderDetails");
      if (stored) {
        try {
          setOrderDetails(JSON.parse(stored));
        } catch {
          navigate("/cart");
        }
      } else {
        navigate("/cart");
      }
    }
  }, [location.state, navigate]);

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading order checkout...</p>
      </div>
    );
  }

  const subtotal = orderDetails.subtotal || 0;
  const shippingCost = orderDetails.shippingCost || 0;
  const discount = orderDetails.discount || 0;
  const totalAmount = orderDetails.totalAmount || subtotal + shippingCost - discount;

  const handleCompletePayment = async () => {
    try {
      setProcessing(true);
      setErrorMsg(null);

      // If order is already created in backend and has an _id
      const orderId = orderDetails._id || orderDetails.orderId || `ord_${Date.now()}`;

      if (selectedMethod === "cod") {
        // Cash on Delivery
        clearCart();
        navigate("/order-success", {
          state: {
            order: {
              ...orderDetails,
              _id: orderId,
              paymentMethod: "cod",
              paymentStatus: "pending",
              status: "confirmed",
            },
          },
        });
        return;
      }

      if (selectedMethod === "demo") {
        // Instant Demo Payment
        const mockPidx = `mock_pidx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await verifyPayment(mockPidx, orderId);

        clearCart();
        navigate("/order-success", {
          state: {
            order: {
              ...orderDetails,
              _id: orderId,
              paymentMethod: "demo",
              paymentStatus: "completed",
              paymentId: mockPidx,
              status: "confirmed",
            },
          },
        });
        return;
      }

      if (selectedMethod === "khalti") {
        // Khalti Payment Gateway
        const initRes = await initiatePayment(orderId, totalAmount, {
          name: userDetails?.username || "Customer",
          email: userDetails?.email || "customer@example.com",
          phone: "9800000000",
        });

        if (initRes?.data?.payment_url) {
          // If in sandbox / demo environment with mock redirect
          if (initRes.data.mock) {
            await verifyPayment(initRes.data.pidx, orderId);
            clearCart();
            navigate("/order-success", {
              state: {
                order: {
                  ...orderDetails,
                  _id: orderId,
                  paymentMethod: "khalti",
                  paymentStatus: "completed",
                  paymentId: initRes.data.pidx,
                  status: "confirmed",
                },
              },
            });
          } else {
            // Live Khalti redirect
            window.location.href = initRes.data.payment_url;
          }
        } else {
          throw new Error(initRes?.message || "Failed to initiate Khalti payment");
        }
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Payment processing failed. Please try another method."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <AppShell />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition mb-2"
            >
              <ArrowLeft size={14} /> Back to Checkout Details
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <CreditCard className="text-indigo-600 dark:text-indigo-400" size={26} /> Payment Method
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-full">
            <Lock size={14} /> 100% Secure Checkout
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 shadow-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Payment Options */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Select Payment Method
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                All transactions are verified server-side with strict encryption.
              </p>

              <div className="space-y-3">
                {/* Option 1: Khalti ePayment */}
                <div
                  onClick={() => setSelectedMethod("khalti")}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedMethod === "khalti"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md"
                      : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700/60 flex items-center justify-center font-black text-purple-700 dark:text-purple-300 text-sm">
                      K
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          Khalti Digital Wallet
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Instant ePayment via Khalti Wallet, eBanking & SCT Cards
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMethod === "khalti"
                        ? "border-indigo-500 bg-indigo-600"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selectedMethod === "khalti" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Option 2: Cash on Delivery */}
                <div
                  onClick={() => setSelectedMethod("cod")}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedMethod === "cod"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md"
                      : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <Truck size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        Cash on Delivery (COD)
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pay with cash or Fonepay QR upon receiving your books
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMethod === "cod"
                        ? "border-indigo-500 bg-indigo-600"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selectedMethod === "cod" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Option 3: Instant Demo Pay */}
                <div
                  onClick={() => setSelectedMethod("demo")}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedMethod === "demo"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md"
                      : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                      <Zap size={20} fill="currentColor" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          Instant Demo Simulation
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Sandbox
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Test full payment confirmation instantly without live charge
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMethod === "demo"
                        ? "border-indigo-500 bg-indigo-600"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selectedMethod === "demo" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Protection Guarantee */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
              <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Your order is backed by our 7-day replacement guarantee for any
                damaged or incorrect items.
              </span>
            </div>
          </div>

          {/* Right Column: Order Summary Box */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm backdrop-blur-xl sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-4 border-b border-slate-200 dark:border-slate-800">
                Payment Summary
              </h2>

              <div className="py-4 space-y-3 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    NPR {subtotal.toLocaleString()}
                  </span>
                </div>

                {discount > 0 ? (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount Savings</span>
                    <span className="font-semibold">
                      - NPR {discount.toLocaleString()}
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Shipping Fee</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {shippingCost === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                    ) : (
                      `NPR ${shippingCost.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 dark:text-white text-base">Total Due</span>
                  <span className="font-black text-2xl text-indigo-600 dark:text-white">
                    NPR {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCompletePayment}
                disabled={processing}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing Payment...
                  </>
                ) : selectedMethod === "khalti" ? (
                  <>
                    <CreditCard size={18} /> Pay NPR {totalAmount.toLocaleString()} via Khalti
                  </>
                ) : selectedMethod === "cod" ? (
                  <>
                    <Truck size={18} /> Place Cash on Delivery Order
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" /> Complete Instant Demo Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PaymentPage;
