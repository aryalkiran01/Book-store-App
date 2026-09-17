import { create } from "zustand";

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

export type TUserDetails = {
  id: string;
  email: string;
  username: string;
  role: string;
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

type TState = {
  userDetails: TUserDetails;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

type TAction = {
  setUserDetails: (user: Partial<TUserDetails>) => void;
  clearUserDetails: () => void;
};

const initialUser: TUserDetails = {
  id: "",
  email: "",
  role: "",
  username: "",
  firstName: "",
  lastName: "",
  displayName: "",
  bio: "",
  avatar: "",
  phone: "",
  location: {
    city: "",
    district: "",
    province: "",
    country: "Nepal",
  },
  address: "",
  isEmailVerified: false,
};

export const useUserDetailsStore = create<TState & TAction>((set) => ({
  userDetails: initialUser,
  isAuthenticated: false,
  isAdmin: false,
  setUserDetails: (user) =>
    set((state) => {
      const merged = { ...state.userDetails, ...user };
      return {
        userDetails: merged,
        isAuthenticated: Boolean(merged.id || merged.email),
        isAdmin: merged.role === "admin",
      };
    }),
  clearUserDetails: () =>
    set(() => ({
      userDetails: initialUser,
      isAuthenticated: false,
      isAdmin: false,
    })),
}));
