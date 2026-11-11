import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMe,
  loginAccount,
  logoutAccount,
  registerAccount,
} from "../api/auth.api";
import type { User } from "../types/api";

export const authKey = ["auth", "me"] as const;

/** The session lives in the TanStack Query cache, so every component shares one source of truth. */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: authKey,
    queryFn: getMe,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { user: query.data ?? null, isLoading: query.isPending };
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginAccount,
    onSuccess: (user: User) => queryClient.setQueryData(authKey, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerAccount,
    onSuccess: (user: User) => queryClient.setQueryData(authKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutAccount,
    onSettled: () => {
      queryClient.clear(); // drop any cached private data
      queryClient.setQueryData(authKey, null);
    },
  });
}
