import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInitiatePayment } from "../api/payment/query";

const Payment = () => {
  const [selectedPayment, setSelectedPayment] = useState<"khalti" | "">("");
  const [orderDetails, setOrderDetails] = useState<{
    totalAmount: number;
    orderId: string;
    subtotal: number;
    shippingCost: number;
    discount: number;
  } | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { mutate: initiatePayment, isPending } = useInitiatePayment();

  // Load order details from state or localStorage
  useEffect(() => {
    if (location.state?.orderDetails) {
      setOrderDetails(location.state.orderDetails);
      localStorage.setItem("orderDetails", JSON.stringify(location.state.orderDetails));
    } else {
      const storedOrderDetails = localStorage.getItem("orderDetails");
      if (storedOrderDetails) {
        setOrderDetails(JSON.parse(storedOrderDetails));
      } else {
        alert("Order details not found. Redirecting to checkout.");
        navigate("/checkout");
      }
    }
  }, [location.state, navigate]);

  if (!orderDetails) return null;

  // Ensure total is always computed correctly
  const computedTotal =
    (orderDetails?.totalAmount ?? 0) + (orderDetails?.shippingCost ?? 0) - (orderDetails?.discount ?? 0);

  // Handle payment initiation
  const handlePayment = () => {
    if (!selectedPayment) {
      alert("Please select a payment method.");
      return;
    }

    initiatePayment(
      {
        orderId: String(orderDetails.orderId),
        amount: computedTotal,
        customerInfo: {
          name: "John Doe", // Replace with actual user info
          email: "johndoe@example.com",
          phone: "9800000000",
        },
      },
      {
        onSuccess: (data) => {
          console.log("Payment initiation response:", data);
          if (data?.data?.payment_url) {
            window.location.href = data.data.payment_url; // Redirect to payment gateway
          } else {
            alert("Failed to initiate payment: " + (data.message || "Unknown error"));
          }
        },
        onError: (error) => {
          console.error("Payment initiation error:", error);
          alert("Something went wrong. Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-md rounded-md flex flex-col md:flex-row gap-6">
      {/* Payment Method Selection */}
      <div className="md:w-2/3">
        <h2 className="text-2xl font-bold mb-4">Select Mode of Payment</h2>
        <p className="text-gray-600 mb-4">To confirm your order, select a payment method and complete the payment.</p>

        <div className="space-y-4">
          <label className="flex items-center border p-3 rounded cursor-pointer">
            <input
              type="radio"
              name="payment"
              value="khalti"
              checked={selectedPayment === "khalti"}
              onChange={() => setSelectedPayment("khalti")}
              className="mr-3"
            />
            <img
              src="https://techlekh.com/wp-content/uploads/2020/06/Khalti-app-in-nepali-language.png"
              alt="Khalti"
              className="h-8"
            />
            <span className="ml-3">Khalti</span>
          </label>
        </div>

        <button
          onClick={handlePayment}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mt-6"
          disabled={isPending}
        >
          {isPending ? "Processing..." : "Confirm & Complete Payment"}
        </button>
      </div>

      {/* Order Summary */}
      <div className="md:w-1/3 p-6 bg-white shadow rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
        <p className="text-sm text-gray-500">Order ID: {orderDetails.orderId}</p>
        <div className="mt-4">
          <p className="flex justify-between font-semibold">
            <span>Subtotal:</span> <span>Rs. {orderDetails?.totalAmount || 0}</span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Cost:</span> <span>Rs. {orderDetails.shippingCost || 0}</span>
          </p>
          <p className="flex justify-between text-red-500">
            <span>Discount:</span> <span>Rs. {orderDetails.discount || 0}</span>
          </p>
          <p className="flex justify-between text-lg font-bold mt-2">
            <span>Total:</span> <span>Rs. {computedTotal}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;
