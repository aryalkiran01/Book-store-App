/* eslint-disable @typescript-eslint/no-explicit-any */
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

const getApiBaseUrl = () => `${env.BACKEND_URL}/api/order`;

export interface CreateOrderResponse {
  message: string;
  isSuccess: boolean;
  data: any;
}

// Fetch all orders for a user
export async function fetchOrdersByUser(userId: string) {
  const response = await axios.get(
    `${getApiBaseUrl()}/user/${userId}`,
    getAxiosConfig()
  );
  return response.data;
}

// Fetch all orders (admin)
export async function fetchAllOrders() {
  const response = await axios.get(
    `${getApiBaseUrl()}/admin/all`,
    getAxiosConfig()
  );
  return response.data;
}

// Fetch a single order by ID
export async function fetchOrderById(orderId: string) {
  const response = await axios.get(
    `${getApiBaseUrl()}/${orderId}`,
    getAxiosConfig()
  );
  return response.data;
}

// Create a new order
export async function createOrder(orderData: any) {
  try {
    const response = await axios.post<CreateOrderResponse>(
      getApiBaseUrl(),
      orderData,
      getAxiosConfig()
    );
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error creating order:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Update order status (admin)
export async function updateOrderStatus(orderId: string, status: string) {
  const response = await axios.patch(
    `${getApiBaseUrl()}/${orderId}`,
    { status },
    getAxiosConfig()
  );
  return response.data;
}

// Cancel an order
export async function cancelOrder(orderId: string) {
  const response = await axios.delete(
    `${getApiBaseUrl()}/${orderId}`,
    getAxiosConfig()
  );
  return response.data;
}

