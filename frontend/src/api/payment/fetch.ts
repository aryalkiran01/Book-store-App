import axios from "axios";
import { env } from "../../config";

function getAxiosConfig() {
  return {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  };
}

const getApiBaseUrl = () => `${env.BACKEND_URL}/api/payments`;

/**
 * -------------------------------------------------------------
 * Khalti Client API
 * -------------------------------------------------------------
 */

export async function initiatePayment(
  orderId: string,
  amount: number,
  customerInfo?: { name?: string; email?: string; phone?: string }
) {
  try {
    const paymentData = {
      return_url: `${env.FRONTEND_URL}/payment/callback?provider=khalti`,
      website_url: env.FRONTEND_URL,
      amount: Math.round(amount * 100), // convert to paisa
      purchase_order_id: String(orderId),
      purchase_order_name: `KitabGhar Order #${orderId}`,
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
      "Error initiating Khalti payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function verifyPayment(pidx: string, orderId?: string) {
  try {
    const response = await axios.post(
      `${getApiBaseUrl()}/verify`,
      { pidx, orderId },
      getAxiosConfig()
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error verifying Khalti payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * -------------------------------------------------------------
 * eSewa Client API
 * -------------------------------------------------------------
 */

export async function initiateEsewaPayment(orderId: string) {
  try {
    const response = await axios.post(
      `${getApiBaseUrl()}/esewa/initiate`,
      { orderId: String(orderId) },
      getAxiosConfig()
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error initiating eSewa payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function verifyEsewaPayment(encodedData: string) {
  try {
    const response = await axios.post(
      `${getApiBaseUrl()}/esewa/verify`,
      { data: encodedData },
      getAxiosConfig()
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error verifying eSewa payment:",
      error.response?.data || error.message
    );
    throw error;
  }
}
