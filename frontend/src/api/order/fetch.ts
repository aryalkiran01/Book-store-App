/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api/order";

//  Fetch all orders for a user
export async function fetchOrdersByUser(userId: string) {
  const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
    withCredentials: true,
  });
  return response.data;
}

//  Fetch a single order by ID
export async function fetchOrderById(orderId: string) {
  const response = await axios.get(`${API_BASE_URL}/${orderId}`, {
    withCredentials: true,
  });
  return response.data;
}

// Create a new order
export async function createOrder(orderData: any) {
  console.log("orderData in axios ", orderData);

  try {
    const response = await axios.post(API_BASE_URL, orderData, {
      withCredentials: true,
    });
    return response.data.data;
  } catch (error: any) {
    console.error(
      "Error creating order:",
      error.response?.data || error.message
    );
    throw error;
  }
}

//  Cancel an order
export async function cancelOrder(orderId: string) {
  const response = await axios.delete(`${API_BASE_URL}/${orderId}`, {
    withCredentials: true,
  });
  return response.data;
}
