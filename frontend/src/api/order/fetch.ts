/* eslint-disable @typescript-eslint/no-explicit-any */
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

const getApiBaseUrl = () => `${env.BACKEND_URL}/api/order`;

export interface CreateOrderResponse {
  message: string;
  isSuccess: boolean;
  data: any;
}

export interface ValidatedCartItem {
  bookId: string;
  title: string;
  author: string;
  genre?: string;
  image?: string;
  originalPrice: number;
  discountPercentage: number;
  effectivePrice: number;
  requestedQuantity: number;
  quantity: number;
  availableStock: number;
  inStock: boolean;
  hasSufficientStock: boolean;
  itemTotal: number;
}

export interface ValidatedCartSummary {
  items: ValidatedCartItem[];
  rawSubtotal: number;
  discountSavings: number;
  subtotal: number;
  shipping: number;
  finalTotal: number;
  totalItems: number;
  isValid: boolean;
  warnings: string[];
}

export async function validateCartApi(
  items: Array<{ bookId: string; quantity: number }>
): Promise<ValidatedCartSummary> {
  const response = await axios.post<{
    message: string;
    isSuccess: boolean;
    data: ValidatedCartSummary;
  }>(`${getApiBaseUrl()}/validate-cart`, { items }, getAxiosConfig());

  return response.data.data;
}

export interface TOrderItem {
  bookId: {
    _id?: string;
    title?: string;
    author?: string;
    image?: string;
    price?: number;
  } | string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface TOrderAddress {
  fullName?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
}

export interface TStatusHistoryItem {
  status: string;
  changedAt: string;
  note?: string;
  changedBy?: string;
}

export interface TOrder {
  _id: string;
  userId:
    | {
        _id: string;
        username: string;
        email: string;
      }
    | string;
  books: TOrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  shippingAddress: TOrderAddress;
  orderNote?: string;
  paymentMethod: "khalti" | "cod" | "card" | "demo";
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  paymentId?: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  statusHistory?: TStatusHistoryItem[];
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface OrderListResponse {
  message: string;
  isSuccess: boolean;
  data: TOrder[];
  pagination: OrderPagination;
}

// Fetch current user's orders
export async function fetchMyOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<OrderListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.status && params.status !== "all")
    query.append("status", params.status);

  const response = await axios.get<OrderListResponse>(
    `${getApiBaseUrl()}/my-orders?${query.toString()}`,
    getAxiosConfig()
  );
  return response.data;
}

// Fetch all orders for a specific user (admin/owner)
export async function fetchOrdersByUser(userId: string, params?: { page?: number; limit?: number; status?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.status && params.status !== "all") query.append("status", params.status);

  const response = await axios.get(
    `${getApiBaseUrl()}/user/${userId}?${query.toString()}`,
    getAxiosConfig()
  );
  return response.data;
}

// Fetch all orders (admin)
export async function fetchAllOrders(params?: { page?: number; limit?: number; status?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.status && params.status !== "all") query.append("status", params.status);

  const response = await axios.get(
    `${getApiBaseUrl()}/admin/all?${query.toString()}`,
    getAxiosConfig()
  );
  return response.data;
}

// Fetch a single order by ID
export async function fetchOrderById(orderId: string): Promise<{ isSuccess: boolean; data: TOrder; message: string }> {
  const response = await axios.get(
    `${getApiBaseUrl()}/${orderId}`,
    getAxiosConfig()
  );
  return response.data;
}

// Create a new order
export async function createOrder(orderData: any): Promise<TOrder> {
  try {
    const response = await axios.post<{
      message: string;
      isSuccess: boolean;
      data: TOrder;
    }>(
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

// Cancel an order (customer or admin)
export async function cancelOrder(orderId: string, reason?: string) {
  const response = await axios.post<{ isSuccess: boolean; data: TOrder; message: string }>(
    `${getApiBaseUrl()}/${orderId}/cancel`,
    { reason },
    getAxiosConfig()
  );
  return response.data;
}

// Update order status (admin)
export async function updateOrderStatus(orderId: string, status: string, note?: string) {
  const response = await axios.patch<{ isSuccess: boolean; data: TOrder; message: string }>(
    `${getApiBaseUrl()}/${orderId}/status`,
    { status, note },
    getAxiosConfig()
  );
  return response.data;
}

// Delete an order (admin)
export async function deleteOrder(orderId: string) {
  const response = await axios.delete(
    `${getApiBaseUrl()}/${orderId}`,
    getAxiosConfig()
  );
  return response.data;
}

