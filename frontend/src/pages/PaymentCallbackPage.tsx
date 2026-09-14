import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, ShoppingBag } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Footer } from "./Footer";
import { clearCart } from "../utils/cartStorage";
import { verifyPayment, verifyEsewaPayment } from "../api/payment/fetch";

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    async function processCallback() {
      // Prevent React StrictMode duplicate in-flight executions
      if (hasVerifiedRef.current) return;
      hasVerifiedRef.current = true;

      try {
        setVerifying(true);
        setErrorMsg(null);

        // Robustly parse query parameters from window.location
        const rawSearch = window.location.search || "";
        const urlParams = new URLSearchParams(rawSearch);
        
        let provider = urlParams.get("provider");
        let esewaData = urlParams.get("data");
        let pidx = urlParams.get("pidx");
        let purchaseOrderId = urlParams.get("purchase_order_id") || urlParams.get("orderId");
        let status = urlParams.get("status");

        // Handle possible concatenated query strings from gateways
        if (!esewaData && rawSearch.includes("data=")) {
          const match = rawSearch.match(/[?&]data=([^&]+)/);
          if (match && match[1]) {
            esewaData = decodeURIComponent(match[1]);
          }
        }

        if (!pidx && rawSearch.includes("pidx=")) {
          const match = rawSearch.match(/[?&]pidx=([^&]+)/);
          if (match && match[1]) {
            pidx = decodeURIComponent(match[1]);
          }
        }

        if (status === "failed" || status === "Canceled" || status === "User canceled") {
          throw new Error("Payment was cancelled or failed at the payment gateway.");
        }

        // 1. Process eSewa v2 callback (?data=base64_json or ?provider=esewa)
        if (esewaData || provider === "esewa") {
          if (!esewaData) {
            throw new Error("Missing eSewa verification data parameter from payment gateway.");
          }

          const response = await verifyEsewaPayment(esewaData);
          if (response?.data?.order || response?.isSuccess) {
            const verifiedOrder = response.data?.order || response.data;
            clearCart();
            navigate("/order-success", {
              replace: true,
              state: {
                order: verifiedOrder,
                paymentProvider: "eSewa",
              },
            });
            return;
          } else {
            throw new Error(response?.message || "eSewa verification failed");
          }
        }

        // 2. Process Khalti v2 callback (?pidx=...&purchase_order_id=...)
        if (pidx || provider === "khalti") {
          if (!pidx) {
            throw new Error("Missing Khalti payment identifier (pidx)");
          }

          const response = await verifyPayment(pidx, purchaseOrderId || undefined);
          if (response?.data?.order || response?.isSuccess) {
            const verifiedOrder = response.data?.order || response.data;
            clearCart();
            navigate("/order-success", {
              replace: true,
              state: {
                order: verifiedOrder,
                paymentProvider: "Khalti",
              },
            });
            return;
          } else {
            throw new Error(response?.message || "Khalti verification failed");
          }
        }

        throw new Error("No payment verification parameters found in the callback request.");
      } catch (err: any) {
        console.error("Payment verification error:", err);
        const detailedMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to verify payment with payment gateway.";
        setErrorMsg(detailedMsg);
      } finally {
        setVerifying(false);
      }
    }

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <AppShell />

      <main className="flex-1 max-w-xl mx-auto px-4 py-16 w-full flex flex-col items-center justify-center">
        {verifying ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center w-full space-y-4">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Verifying Payment...
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Please wait while we confirm your transaction securely with the payment gateway.
            </p>
          </div>
        ) : errorMsg ? (
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-8 shadow-xl text-center w-full space-y-6">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <AlertCircle size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Payment Verification Failed
              </h1>
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                {errorMsg}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/payment"
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
              >
                <RefreshCw size={14} /> Retry Payment
              </Link>
              <Link
                to="/orders"
                className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <ShoppingBag size={14} /> View Order History
              </Link>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

export default PaymentCallbackPage;
