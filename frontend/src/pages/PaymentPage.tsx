import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowLeft,
  Lock,
  AlertCircle,
  Loader2,
  Wallet,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { clearCart } from "../utils/cartStorage";
import { initiatePayment, initiateEsewaPayment } from "../api/payment/fetch";
import { useUserDetailsStore } from "../store/useUsersDetails";

export function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userDetails } = useUserDetailsStore();

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<"khalti" | "esewa" | "cod">("khalti");
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
  const orderId = orderDetails._id || orderDetails.orderId;

  const handleCompletePayment = async () => {
    if (!orderId) {
      setErrorMsg("Missing valid order identifier. Please return to checkout.");
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg(null);

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

      if (selectedMethod === "esewa") {
        // 1. Initiate eSewa Payment
        const esewaRes = await initiateEsewaPayment(orderId);
        if (esewaRes?.data?.payment_url && esewaRes?.data?.formData) {
          const { payment_url, formData } = esewaRes.data;

          // Dynamically construct and submit the official eSewa form POST request
          const form = document.createElement("form");
          form.method = "POST";
          form.action = payment_url;

          Object.keys(formData).forEach((key) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = formData[key];
            form.appendChild(input);
          });

          document.body.appendChild(form);
          form.submit();
          return;
        } else {
          throw new Error(esewaRes?.message || "Failed to initiate eSewa payment");
        }
      }

      if (selectedMethod === "khalti") {
        // 2. Initiate Khalti Payment
        const initRes = await initiatePayment(orderId, totalAmount, {
          name: userDetails?.username || orderDetails.customerInfo?.fullName || "Customer",
          email: userDetails?.email || orderDetails.customerInfo?.email || "customer@example.com",
          phone: orderDetails.customerInfo?.phone || "9800000000",
        });

        if (initRes?.data?.payment_url) {
          // Redirect browser to official Khalti payment gateway URL
          window.location.href = initRes.data.payment_url;
          return;
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
              <CreditCard className="text-indigo-600 dark:text-indigo-400" size={26} /> Select Payment Method
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-full">
            <Lock size={14} /> Official Sandboxes Enabled
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
                Choose Gateway
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                All transactions are verified server-side with HMAC-SHA256 & direct lookup APIs.
              </p>

              <div className="space-y-3">
                {/* Option 1: Khalti ePayment */}
                <div
                  onClick={() => setSelectedMethod("khalti")}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedMethod === "khalti"
                      ? "bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/30"
                      : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-purple-600/20">
                      K
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          Khalti Digital Wallet
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Official Sandbox
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pay via Khalti Wallet (Test Account: 9800000000 / MPIN: 1111)
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMethod === "khalti"
                        ? "border-purple-600 bg-purple-600"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selectedMethod === "khalti" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Option 2: eSewa ePay */}
                <div
                  onClick={() => setSelectedMethod("esewa")}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedMethod === "esewa"
                      ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                      : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                      e
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          eSewa ePay
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Official Sandbox
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pay via eSewa (Test ID: 9841000000 / Password: Nepal@123 / MPIN: 1122)
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedMethod === "esewa"
                        ? "border-emerald-600 bg-emerald-600"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {selectedMethod === "esewa" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Option 3: Cash on Delivery */}
                <div
                  onClick={() => setSelectedMethod("cod")}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    selectedMethod === "cod"
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-md"
                      : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Truck size={22} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        Cash on Delivery (COD)
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pay in cash upon doorstep delivery of your book package
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
              </div>
            </div>

            {/* Buyer Protection Guarantee */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
              <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Your order is backed by KitabGhar's authentic delivery and replacement guarantee.
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
                className={`w-full mt-4 py-3.5 text-white font-bold rounded-xl transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 ${
                  selectedMethod === "khalti"
                    ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30"
                    : selectedMethod === "esewa"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                }`}
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Connecting to Gateway...
                  </>
                ) : selectedMethod === "khalti" ? (
                  <>
                    <Wallet size={18} /> Pay NPR {totalAmount.toLocaleString()} with Khalti
                  </>
                ) : selectedMethod === "esewa" ? (
                  <>
                    <CreditCard size={18} /> Pay NPR {totalAmount.toLocaleString()} with eSewa
                  </>
                ) : (
                  <>
                    <Truck size={18} /> Place Cash on Delivery Order
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
