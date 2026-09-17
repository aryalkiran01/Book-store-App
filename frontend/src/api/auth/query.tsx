import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loginUser,
  logout,
  me,
  registerUser,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  TLoginUserInput,
  TLoginUserOutput,
  TLogoutOutput,
  TMeOutput,
  TRegisterUserInput,
  TRegisterUserOutput,
  TUpdateProfileInput,
} from "./fetch";
import { useUserDetailsStore } from "../../store/useUsersDetails";

// for register api
export function useRegisterUserMutation() {
  return useMutation<TRegisterUserOutput, Error, TRegisterUserInput>({
    mutationFn: registerUser,
  });
}

// for login api
export function useLoginUserMutation() {
  const queryClient = useQueryClient();
  return useMutation<TLoginUserOutput, Error, TLoginUserInput>({
    mutationFn: loginUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// for me api
export function useMeQuery() {
  return useQuery<TMeOutput, Error>({
    queryKey: ["me"],
    queryFn: me,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// for update profile api
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { setUserDetails } = useUserDetailsStore();

  return useMutation<TMeOutput, Error, TUpdateProfileInput>({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      if (data?.data) {
        setUserDetails(data.data);
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// for avatar upload
export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  const { setUserDetails } = useUserDetailsStore();

  return useMutation<TMeOutput, Error, File>({
    mutationFn: uploadAvatar,
    onSuccess: (data) => {
      if (data?.data) {
        setUserDetails(data.data);
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// for remove avatar
export function useRemoveAvatarMutation() {
  const queryClient = useQueryClient();
  const { setUserDetails } = useUserDetailsStore();

  return useMutation<TMeOutput, Error, void>({
    mutationFn: removeAvatar,
    onSuccess: (data) => {
      if (data?.data) {
        setUserDetails(data.data);
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// for logout api
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const { clearUserDetails } = useUserDetailsStore();

  return useMutation<TLogoutOutput, Error, object>({
    mutationFn: logout,
    onSuccess: () => {
      clearUserDetails();
      queryClient.clear();
    },
  });
}

