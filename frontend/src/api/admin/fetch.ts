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

const getApiBaseUrl = () => `${env.BACKEND_URL}/api/admin`;

export interface AdminMetrics {
  totalUsers: number;
  totalBooks: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  pendingOrders: number;
  processingOrders: number;
  lowStockBooksCount: number;
  outOfStockBooksCount: number;
}

export interface AdminStatsData {
  metrics: AdminMetrics;
  orderStatusBreakdown: Record<string, number>;
  recentOrders: any[];
  recentReviews: any[];
  topCategories: Array<{
    _id: string;
    count: number;
    totalStock: number;
    avgPrice: number;
  }>;
}

export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 1. Fetch Dashboard Stats
export async function fetchAdminStats(): Promise<AdminStatsData> {
  const response = await axios.get<{
    isSuccess: boolean;
    data: AdminStatsData;
  }>(`${getApiBaseUrl()}/stats`, getAxiosConfig());
  return response.data.data;
}

// 2. Fetch Users
export async function fetchAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<{ data: AdminUser[]; pagination: PaginationData }> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.role && params.role !== "all") query.append("role", params.role);

  const response = await axios.get<{
    isSuccess: boolean;
    data: AdminUser[];
    pagination: PaginationData;
  }>(`${getApiBaseUrl()}/users?${query.toString()}`, getAxiosConfig());
  return response.data;
}

// 3. Update User Role
export async function updateAdminUserRole(
  userId: string,
  role: "admin" | "user"
) {
  const response = await axios.patch(
    `${getApiBaseUrl()}/users/${userId}/role`,
    { role },
    getAxiosConfig()
  );
  return response.data;
}

// 4. Delete User
export async function deleteAdminUser(userId: string) {
  const response = await axios.delete(
    `${getApiBaseUrl()}/users/${userId}`,
    getAxiosConfig()
  );
  return response.data;
}

// 5. Fetch Inventory
export async function fetchAdminInventory(params?: {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  stockFilter?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.genre && params.genre !== "all")
    query.append("genre", params.genre);
  if (params?.stockFilter && params.stockFilter !== "all")
    query.append("stockFilter", params.stockFilter);
  if (params?.sortBy) query.append("sortBy", params.sortBy);
  if (params?.sortOrder) query.append("sortOrder", params.sortOrder);

  const response = await axios.get<{
    isSuccess: boolean;
    data: any[];
    summary: {
      totalProducts: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
    pagination: PaginationData;
  }>(`${getApiBaseUrl()}/inventory?${query.toString()}`, getAxiosConfig());
  return response.data;
}

// 6. Quick Update Stock
export async function quickUpdateStock(bookId: string, stock: number) {
  const response = await axios.patch(
    `${getApiBaseUrl()}/inventory/${bookId}/stock`,
    { stock },
    getAxiosConfig()
  );
  return response.data;
}

// 7. Categories Analytics
export async function fetchAdminCategories() {
  const response = await axios.get<{
    isSuccess: boolean;
    data: Array<{
      genre: string;
      bookCount: number;
      totalStock: number;
      avgPrice: number;
      minPrice: number;
      maxPrice: number;
      featuredCount: number;
    }>;
  }>(`${getApiBaseUrl()}/categories`, getAxiosConfig());
  return response.data.data;
}

// 8. Authors Analytics
export async function fetchAdminAuthors() {
  const response = await axios.get<{
    isSuccess: boolean;
    data: Array<{
      author: string;
      bookCount: number;
      totalStock: number;
      genres: string[];
      avgRating: number;
    }>;
  }>(`${getApiBaseUrl()}/authors`, getAxiosConfig());
  return response.data.data;
}

// 9. Moderate Review
export async function moderateAdminReview(
  reviewId: string,
  status: "published" | "flagged" | "hidden"
) {
  const response = await axios.patch(
    `${getApiBaseUrl()}/reviews/${reviewId}/moderate`,
    { status },
    getAxiosConfig()
  );
  return response.data;
}

// 10. Delete Review Admin
export async function deleteAdminReview(reviewId: string) {
  const response = await axios.delete(
    `${getApiBaseUrl()}/reviews/${reviewId}`,
    getAxiosConfig()
  );
  return response.data;
}

// 11. Fetch Admin Reviews
export async function fetchAdminReviews(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.search) query.append("search", params.search);
  if (params?.status && params.status !== "all")
    query.append("status", params.status);

  const response = await axios.get<{
    isSuccess: boolean;
    data: any[];
    flaggedCount: number;
    pagination: PaginationData;
  }>(`${getApiBaseUrl()}/reviews?${query.toString()}`, getAxiosConfig());
  return response.data;
}

// 12. Fetch Admin Orders
export async function fetchAdminOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.status && params.status !== "all")
    query.append("status", params.status);

  const response = await axios.get<{
    isSuccess: boolean;
    data: any[];
    pagination: PaginationData;
  }>(`${getApiBaseUrl()}/orders?${query.toString()}`, getAxiosConfig());
  return response.data;
}

export interface OpenLibraryBook {
  googleBooksId?: string;
  openLibraryId: string;
  title: string;
  author: string;
  isbn: string;
  coverId: string;
  coverUrl: string;
  firstPublishYear?: number | string;
  genre: string;
  pages: number;
  publisher: string;
  language: string;
  suggestedPriceNPR?: number;
  source?: string;
  isAlreadyImported?: boolean;
  existingBookId?: string;
}

export interface ImportOpenLibraryBookPayload {
  title: string;
  author: string;
  genre?: string;
  description?: string;
  isbn?: string;
  googleBooksId?: string;
  openLibraryId?: string;
  coverId?: string;
  image?: string;
  publisher?: string;
  publicationDate?: string;
  pages?: number;
  language?: string;
  price?: number;
  discountPercentage?: number;
  stock?: number;
  featured?: boolean;
  isNewArrival?: boolean;
  source?: string;
}


// 13. Search Open Library
export async function searchOpenLibraryBooks(
  searchQuery: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  data: OpenLibraryBook[];
  total: number;
  page: number;
  limit: number;
}> {
  const query = new URLSearchParams();
  query.append("query", searchQuery);
  query.append("page", String(page));
  query.append("limit", String(limit));

  const response = await axios.get<{
    isSuccess: boolean;
    data: OpenLibraryBook[];
    total: number;
    page: number;
    limit: number;
  }>(`${getApiBaseUrl()}/open-library/search?${query.toString()}`, getAxiosConfig());

  return response.data;
}

// 14. Import Book from Open Library into MongoDB
export async function importOpenLibraryBook(
  payload: ImportOpenLibraryBookPayload
): Promise<{
  message: string;
  isSuccess: boolean;
  data: any;
  isNew: boolean;
}> {
  const response = await axios.post<{
    message: string;
    isSuccess: boolean;
    data: any;
    isNew: boolean;
  }>(`${getApiBaseUrl()}/open-library/import`, payload, getAxiosConfig());

  return response.data;
}

