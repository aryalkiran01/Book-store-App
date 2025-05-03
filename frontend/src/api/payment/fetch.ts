import axios from "axios";

const API_BASE_URL =
  "const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/payments`";

// Initiate a payment for Khalti
export async function initiatePayment(
  orderId: string,
  amount: number,
  customerInfo: { name?: string; email?: string; phone?: string }
) {
  try {
    const paymentData = {
      return_url: "http://localhost:5173/books",
      website_url: "http://localhost:5173",
      amount,
      purchase_order_id: orderId,
      purchase_order_name: "Your Item Name",
      customer_info: customerInfo,
    };

    const response = await axios.post(`${API_BASE_URL}/initiate`, paymentData, {
      withCredentials: true,
    });
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(
      "Error initiating payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Verify Payment for Khalti
export async function verifyPayment(pidx: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/verify`,
      { pidx },
      { withCredentials: true }
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(
      "Error verifying payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}
