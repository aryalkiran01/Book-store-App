import axios from "axios";
import { env } from "../../config";

function getAxiosConfig() {
  const token = localStorage.getItem("token");
  return {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

const getApiBaseUrl = () => `${env.BACKEND_URL}/api/payments`;

// Initiate a payment for Khalti
export async function initiatePayment(
  orderId: string,
  amount: number,
  customerInfo: { name?: string; email?: string; phone?: string }
) {
  try {
    const paymentData = {
      return_url: `${env.FRONTEND_URL}/checkout`,
      website_url: env.FRONTEND_URL,
      amount: Math.round(amount * 100), // convert to paisa
      purchase_order_id: String(orderId),
      purchase_order_name: `Order #${orderId}`,
      customer_info: customerInfo,
    };

    const response = await axios.post(
      `${getApiBaseUrl()}/initiate`,
      paymentData,
      getAxiosConfig()
    );
    return response.data;
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
      `${getApiBaseUrl()}/verify`,
      { pidx },
      getAxiosConfig()
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error verifying payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}

