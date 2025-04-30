import { useMutation } from "@tanstack/react-query";
import { initiatePayment, verifyPayment } from "./fetch";

// Initiate a Khalti Payment
export function useInitiatePayment() {
  return useMutation({
    mutationFn: ({
      orderId,
      amount,
      customerInfo,
    }: {
      orderId: string;
      amount: number;
      customerInfo: {
        name?: string;
        email?: string;
        phone?: string;
      };
    }) => initiatePayment(orderId, amount, customerInfo),

    onSuccess: (data) => {
      if (data.payment_url) {
        window.location.href = data.payment_url; // Redirect to Khalti payment gateway
      } else {
        console.error("Payment initiation failed:", data.message);
      }
    },

    onError: (error) => {
      console.error("Payment Error:", error);
    },
  });
}

// Verify Khalti Payment
export function useVerifyPayment() {
  return useMutation({
    mutationFn: (pidx: string) => verifyPayment(pidx),

    onSuccess: (data) => {
      console.log("Payment verified successfully:", data);
    },

    onError: (error) => {
      console.error("Payment verification failed:", error);
    },
  });
}
