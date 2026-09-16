import { env } from "../config";

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuthRedirect?: boolean;
}

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Standardized HTTP client with automatic cookie forwarding, query serialization, and 401 session redirection
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuthRedirect = false, headers: customHeaders, ...fetchOptions } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${env.BACKEND_URL}${endpoint}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...(customHeaders as Record<string, string>),
    },
    ...fetchOptions,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const errorMessage =
      (typeof data === "object" && data?.message) ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;

    // Handle 401 Unauthorized with seamless login redirection
    if (response.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}
