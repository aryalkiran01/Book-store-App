import { env } from "../../config";

export function getAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
  };
}

/**
 * For register api
 */
export type TRegisterUserOutput = {
  message: string;
  isSuccess: boolean;
  data: { username: string; email: string; id: string };
};

export type TRegisterUserInput = {
  username: string;
  email: string;
  password: string;
};

export async function registerUser(
  input: TRegisterUserInput
): Promise<TRegisterUserOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: input.username,
      email: input.email,
      password: input.password,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return data;
}

/**
 * For login api
 */
export type TUserRole = "admin" | "user";

export type TLoginUserOutput = {
  message: string;
  isSuccess: boolean;
  data: {
    user: {
      username: string;
      email: string;
      id: string;
      role: TUserRole;
    };
  };
};

export type TLoginUserInput = {
  email: string;
  password: string;
};

export async function loginUser(
  input: TLoginUserInput
): Promise<TLoginUserOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

/**
 * For me & profile summary api
 */
export type TUserLocation = {
  city?: string;
  district?: string;
  province?: string;
  country?: string;
};

export type TUserStatistics = {
  orders: number;
  reviews: number;
  wishlist: number;
  booksPurchased: number;
};

export type TProfileCompletion = {
  percentage: number;
  completedCount: number;
  totalCount: number;
  steps: Array<{
    key: string;
    label: string;
    completed: boolean;
  }>;
};

export type TUserProfileData = {
  id: string;
  username: string;
  email: string;
  role: TUserRole;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  location?: TUserLocation;
  address?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  memberSince?: string;
  createdAt?: string;
  updatedAt?: string;
  statistics?: TUserStatistics;
  completion?: TProfileCompletion;
};

export type TMeOutput = {
  message: string;
  isSuccess: boolean;
  data: TUserProfileData;
};

export async function me(): Promise<TMeOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Not authenticated");
  }

  return data;
}

export type TUpdateProfileInput = {
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  location?: TUserLocation;
};

export async function updateProfile(
  input: TUpdateProfileInput
): Promise<TMeOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/profile`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update profile");
  }

  return data;
}

export async function uploadAvatar(file: File): Promise<TMeOutput> {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${env.BACKEND_URL}/api/auth/avatar`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to upload avatar");
  }

  return data;
}

export async function removeAvatar(): Promise<TMeOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/avatar`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to remove avatar");
  }

  return data;
}

export type TUsernameAvailabilityOutput = {
  message: string;
  isSuccess: boolean;
  data: {
    available: boolean;
    username: string;
  };
};

export async function checkUsernameAvailability(
  username: string
): Promise<TUsernameAvailabilityOutput> {
  const res = await fetch(
    `${env.BACKEND_URL}/api/auth/username-availability?username=${encodeURIComponent(
      username
    )}`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to check username availability");
  }

  return data;
}

/**
 * For logout api
 */
export type TLogoutOutput = {
  message: string;
  isSuccess: boolean;
};

export async function logout(): Promise<TLogoutOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Logout failed");
  }

  return data;
}

export async function logoutAllSessions(): Promise<{ message: string; isSuccess: boolean }> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/logout-all`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to invalidate sessions");
  }

  return data;
}

/**
 * Email change & verification workflows
 */
export async function requestEmailChange(newEmail: string): Promise<{ message: string; isSuccess: boolean; verificationToken?: string }> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/change-email`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ newEmail }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to request email change");
  }

  return data;
}

export async function verifyEmailChange(token: string): Promise<{ message: string; isSuccess: boolean; data: any }> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/verify-new-email`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ token }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to verify new email");
  }

  return data;
}

export async function sendEmailVerification(): Promise<{ message: string; isSuccess: boolean; data?: { verificationToken?: string } | null }> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/email-verification/send`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to send verification email");
  }

  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string; isSuccess: boolean; data: any }> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/email-verification/verify`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ token }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Verification failed");
  }

  return data;
}

/**
 * For change password api
 */
export type TChangePasswordInput = {
  oldPassword: string;
  newPassword: string;
};

export type TChangePasswordOutput = {
  message: string;
  isSuccess: boolean;
  data: null;
};

export async function changePassword(
  input: TChangePasswordInput
): Promise<TChangePasswordOutput> {
  const res = await fetch(`${env.BACKEND_URL}/api/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to change password");
  }

  return data;
}


