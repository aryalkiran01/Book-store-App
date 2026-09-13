import { create } from "zustand";

export type TUserDetails = {
  id: string;
  email: string;
  username: string;
  role: string;
};

type TState = {
  userDetails: TUserDetails;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

type TAction = {
  setUserDetails: (user: TUserDetails) => void;
  clearUserDetails: () => void;
};

const initialUser: TUserDetails = {
  id: "",
  email: "",
  role: "",
  username: "",
};

export const useUserDetailsStore = create<TState & TAction>((set) => ({
  userDetails: initialUser,
  isAuthenticated: false,
  isAdmin: false,
  setUserDetails: (user) =>
    set(() => ({
      userDetails: user,
      isAuthenticated: Boolean(user.id || user.email),
      isAdmin: user.role === "admin",
    })),
  clearUserDetails: () =>
    set(() => ({
      userDetails: initialUser,
      isAuthenticated: false,
      isAdmin: false,
    })),
}));